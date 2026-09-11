import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createContext, runInContext, runInNewContext } from 'node:vm'
import { rolldown, type Plugin, type RolldownOutput } from 'rolldown'
import { dev } from 'rolldown/experimental'
import { describe, expect, it, vi } from 'vitest'
import { getNativePrelude } from '../runtime/native-prelude'
import { workletImportsPlugin } from '../plugins/workletImportsPlugin'
import {
  buildNativeBundle,
  createNativeDevAssetRegistry,
  createNativeDevEngine,
  getNativeAssetData,
  getHermesSWCIncludes,
  getHmrRuntimeSource,
  getNativeTransformConfig,
  hermesCompatSWCPlugin,
  hmrClientNoopPlugin,
  nativeAnimatedGuardPlugin,
  normalizeNativeCommonJSInterop,
  vxrnCompilerPlugin,
  wrapNativeBundleModuleScope,
  type NativePluginContext,
} from './createNativeDevEngine'

describe.each(['ios', 'android'] as const)('native plugin adapters on %s', (platform) => {
  it.each(['dev', 'build'] as const)('binds configured plugins to the %s bundle', async (mode) => {
    const root = await mkdtemp(join(tmpdir(), 'vxrn-native-plugin-adapter-'))
    await writeFile(
      join(root, 'entry.js'),
      `globalThis.nativePluginResult = [__GLOBAL_PLUGIN__, __DIRECT_PLUGIN__, 'plain-plugin']`
    )
    const factories = ['global', 'direct'].map((name) =>
      vi.fn((context: NativePluginContext): Plugin => ({
        name: `${name}-native`,
        transform(code, id) {
          if (id.endsWith('/entry.js')) {
            return code.replace(`__${name.toUpperCase()}_PLUGIN__`, JSON.stringify({ name, ...context }))
          }
        },
      }))
    )
    const plugins = factories.map((vxrnNative, index): Plugin => ({
      name: `adapter-${index}`,
      api: { vxrnNative },
    }))
    const previousPlugins = globalThis.__vxrnAddNativePlugins
    globalThis.__vxrnAddNativePlugins = [plugins[0]]
    const configuredPlugins: Plugin[] = [
      plugins[1],
      {
        name: 'plain-native-plugin',
        transform(code, id) {
          if (id.endsWith('/__virtual-native-entry.tsx')) return `import './entry.js'`
          if (id.endsWith('/entry.js')) return code.replace('plain-plugin', 'plain')
        },
      },
    ]
    let native: Awaited<ReturnType<typeof createNativeDevEngine>> | undefined
    try {
      let code: string
      if (mode === 'dev') {
        native = await createNativeDevEngine({ root, platform, port: 0, plugins: configuredPlugins })
        code = (await native.getBundle()).code
      } else {
        code = (await buildNativeBundle({ root, platform, entryFile: 'entry.js', plugins: configuredPlugins })).code
      }
      const context = { console, setTimeout, clearTimeout, __GLOBAL_PLUGIN__: 'unadapted', __DIRECT_PLUGIN__: 'unadapted' }
      runInNewContext(code, context)
      expect(Reflect.get(context, 'nativePluginResult')).toEqual([
        { name: 'global', root, platform, dev: mode === 'dev' },
        { name: 'direct', root, platform, dev: mode === 'dev' },
        'plain',
      ])
      for (const factory of factories) {
        expect(factory).toHaveBeenCalledExactlyOnceWith({ root, platform, dev: mode === 'dev' })
      }
    } finally {
      await native?.close()
      globalThis.__vxrnAddNativePlugins = previousPlugins
      await rm(root, { recursive: true, force: true })
    }
  })
})

const nativeTransformProbe = `
export const transformProbe = () => {
  'worklet'
  return 'transformed'
}
`

// node guards lowering semantics; the async-default regression itself needs
// hermes, where the original arrow resolves its await to undefined.
describe.each(['rolldown-dev', 'rolldown-build', 'metro-module', 'metro-script'])(
  'native async through %s',
  (pipeline) => {
    it('preserves defaults, lexical bindings, bigint, rejection, and iterator cleanup', async () => {
      const id = '/project/native-async.js'
      const source = `
globalThis.result = (function(parentArgument) {
  const events = [];
  const run = async(value = 2n, fail = false) => {
    try {
      const awaited = await (fail ? Promise.reject(new Error('rejected')) : Promise.resolve(3n));
      events.push('after-await');
      return [String(value + awaited), this.base, arguments[0]];
    } catch (error) { return error.message; }
    finally { events.push('finally'); }
  };
  const badDefault = async(value = (() => { throw new Error('default'); })()) => value;
  let synchronousThrow = false;
  let rejectedDefault;
  try { rejectedDefault = badDefault().catch(error => error.message); }
  catch { synchronousThrow = true; }
  async function* values() {
    try { yield 1n; yield 2n; }
    finally { events.push('closed'); }
  }
  const first = async() => { for await (const value of values()) return String(value); };
  return Promise.all([run(), run(4n), run(undefined, true), rejectedDefault, first()])
    .then(values => ({ values, events, synchronousThrow }));
}).call({ base: 7 }, 'lexical');
`
      let output: any
      if (pipeline.startsWith('metro')) {
        const { transform } = await import('@vxrn/vite-plugin-metro/metroNativeWorker')
        const result = await transform({}, '/project', id, Buffer.from(source), {
          dev: false,
          platform: 'ios',
          type: pipeline === 'metro-script' ? 'script' : 'module',
        })
        const data = result.output[0].data
        const { fromRawMappings } = await import('metro-source-map')
        output = {
          code: data.code,
          map: (fromRawMappings as any)([
            { code: data.code, path: id, source, map: data.map },
          ]).toMap(),
        }
      } else {
        const plugin = hermesCompatSWCPlugin(pipeline === 'rolldown-dev', true)
        output = await Reflect.apply(plugin.transform as Function, undefined, [
          source,
          id,
        ])
      }
      const context: any = {}
      context.__d = (factory: any) => {
        const module = { exports: {} }
        factory(
          context,
          (name: string) => {
            throw new Error(`unexpected dependency ${name}`)
          },
          () => {},
          () => {},
          module,
          module.exports,
          []
        )
      }
      runInNewContext(output.code, context)
      const result = await context.result
      expect(result.values).toEqual([
        ['5', 7, 'lexical'],
        ['7', 7, 'lexical'],
        'rejected',
        'default',
        '1',
      ])
      expect(result.synchronousThrow).toBe(false)
      expect(result.events.filter((value: string) => value === 'finally')).toHaveLength(3)
      expect(result.events.filter((value: string) => value === 'closed')).toHaveLength(1)
      const { originalPositionFor, TraceMap } = await import('@jridgewell/trace-mapping')
      const lines = output.code.split('\n')
      const line = lines.findIndex((value: string) => value.includes('after-await'))
      const position = originalPositionFor(new TraceMap(output.map), {
        line: line + 1,
        column: lines[line].indexOf('events.push'),
      })
      expect(position.source).toBe(id)
      expect(position.line).toBe(
        source.split('\n').findIndex((value) => value.includes('after-await')) + 1
      )
    })
  }
)

describe.each(['shared', 'rolldown', 'metro'])('React Compiler worklets through %s', (pipeline) => {
  it.each([
    ['block', 'useDerivedValue(() => { return value + 8 }, [value])', 18],
    ['expression', 'useDerivedValue(() => value + 8, [value])', 18],
    ['object', 'useDerivedValue(() => ({ lift: value + 8 }), [value])', { lift: 18 }],
    ['nested', 'useDerivedValue(() => runOnUI(() => value + 8), [value])', 18],
    ['gesture', 'useDerivedValue(() => Gesture.Pan().onUpdate(() => value + 8), [value])', 18],
  ])('preserves %s callbacks on the UI runtime and memoizes stable inputs', async (_name, callback, expected) => {
    const compiler = await import('@vxrn/compiler')
    const { parseSync } = await import('oxc-parser')
    const { default: MagicString } = await import('magic-string')
    const { TraceMap, originalPositionFor } = await import('@jridgewell/trace-mapping')
    const projectRoot = await createWorkletsProject(false)
    const sourceMaps = process.env.VXRN_ENABLE_SOURCE_MAP
    process.env.VXRN_ENABLE_SOURCE_MAP = '1'
    compiler.configureVXRNCompilerPlugin({
      enableCompiler: true,
      enableReanimated: true,
      enableNativeWorklets: true,
    })
    try {
      const id = join(projectRoot, 'useProbe.ts')
      const source = `export function useProbe(value) {\n return ${callback};\n}\n`
      await writeFile(id, source)
      let result: any
      if (pipeline === 'shared') {
        const plugins = await compiler.createVXRNCompilerPlugin()
        const plugin = plugins.find((p: any) => p.name === 'one:compiler') as any
        await plugin.configResolved({ root: projectRoot, build: {} })
        const hook = plugin.transform.handler || plugin.transform
        result = await hook.call({ environment: { name: 'ios' } }, source, id)
      } else if (pipeline === 'metro') {
        const { transform } = await import('@vxrn/vite-plugin-metro/metroNativeWorker')
        const output = await transform({}, projectRoot, id, Buffer.from(source), {
          dev: false,
          platform: 'ios',
          type: 'module',
          customTransformOptions: { reactCompiler: true, worklets: true },
        })
        const data = output.output[0].data
        const msm = await import('metro-source-map')
        result = {
          code: data.code,
          map: (msm.fromRawMappings as any)([{ code: data.code, path: id, source, map: data.map }]).toMap(),
        }
      } else {
        const plugin = vxrnCompilerPlugin('ios', false, projectRoot, true)
        result = await Reflect.apply(plugin.transform as Function, undefined, [source, id])
      }
      const runnable = new MagicString(result.code)
      for (const node of parseSync('probe.js', result.code).program.body) {
        if (node.type === 'ImportDeclaration') runnable.remove(node.start, node.end)
        if (node.type === 'ExportNamedDeclaration' && node.declaration) {
          runnable.remove(node.start, node.declaration.start)
        }
      }
      let cache: any[] | undefined
      let cacheCalls = 0
      const memo = (size: number) => {
        cacheCalls++
        return cache ??= Array(size).fill(Symbol.for('react.memo_cache_sentinel'))
      }
      const module = { exports: {} as any }
      const probe = new Function('_c', 'useDerivedValue', 'runOnUI', 'Gesture', '__d', 'module',
        `${runnable}\nreturn ${pipeline === 'metro' ? 'module.exports.useProbe' : 'useProbe'}`
      )(
        memo,
        (fn: any) => fn,
        (fn: any) => fn,
        { Pan: () => ({ onUpdate: (fn: any) => fn }) },
        (factory: any) => factory(globalThis, () => ({ c: memo }), () => {}, () => {}, module, module.exports, []),
        module
      )
      const first = probe(10)
      expect(first.__initData?.code).toBeTypeOf('string')
      for (const onUI of [false, true]) {
        let fn = first
        let value: any
        for (let depth = 0; depth < 2; depth++) {
          expect(fn.__initData?.code).toBeTypeOf('string')
          value = onUI
            ? new Function('runOnUI', `return (${fn.__initData.code})`)((fn: any) => fn)
                .call({ __closure: fn.__closure })
            : fn()
          if (typeof value !== 'function') break
          fn = value
        }
        expect(value).toEqual(expected)
      }
      expect(probe(10)).toBe(first)
      expect(cacheCalls).toBe(2)
      expect(probe(20)).not.toBe(first)

      const lines = result.code.split('\n')
      const line = lines.findIndex((text: string) => text.includes('function useProbe('))
      expect(line).toBeGreaterThanOrEqual(0)
      const position = originalPositionFor(new TraceMap(result.map), {
        line: line + 1,
        column: lines[line].indexOf('function'),
      })
      expect(position.source).toBe(id)
      expect(position.line).toBe(1)
    } finally {
      if (sourceMaps === undefined) delete process.env.VXRN_ENABLE_SOURCE_MAP
      else process.env.VXRN_ENABLE_SOURCE_MAP = sourceMaps
      compiler.configureVXRNCompilerPlugin({
        enableCompiler: false,
        enableReanimated: false,
        enableNativeWorklets: false,
      })
      await rm(projectRoot, { recursive: true, force: true })
    }
  })
})

async function createWorkletsProject(throwOnTransform = true) {
  const testRoot = await mkdtemp(join(tmpdir(), 'vxrn-native-transform-failure-'))
  const packageRoot = join(testRoot, 'node_modules/react-native-worklets')
  await mkdir(packageRoot, { recursive: true })
  await writeFile(
    join(packageRoot, 'package.json'),
    JSON.stringify({ name: 'react-native-worklets', version: '0.10.1' })
  )
  await writeFile(
    join(packageRoot, 'plugin.js'),
    throwOnTransform
      ? `module.exports = () => ({
      visitor: {
        Program() {
          throw new Error('NATIVE_TRANSFORM_NEGATIVE_CONTROL')
        }
      }
    })`
      : `module.exports = () => ({ visitor: {} })`
  )
  await writeFile(join(testRoot, 'entry.ts'), nativeTransformProbe)
  return testRoot
}

describe('native prelude', () => {
  it('does not advertise a host event API that cannot remove listeners', () => {
    const context = {
      addEventListener() {},
    }

    runInNewContext(getNativePrelude({ dev: false, platform: 'ios' }), context)

    expect(Reflect.get(context, 'addEventListener')).toBeUndefined()
  })

  it('preserves a complete host event API', () => {
    const addEventListener = () => {}
    const removeEventListener = () => {}
    const context = { addEventListener, removeEventListener }

    runInNewContext(getNativePrelude({ dev: false, platform: 'ios' }), context)

    expect(context.addEventListener).toBe(addEventListener)
    expect(context.removeEventListener).toBe(removeEventListener)
  })
})

describe('native pure-function worklet imports', () => {
  it('keeps live module versions isolated across a transitive HMR update', async () => {
    const root = await createWorkletsProject(false)
    const packageRoot = join(root, 'node_modules/pure-math')
    await mkdir(packageRoot, { recursive: true })
    await writeFile(
      join(packageRoot, 'package.json'),
      JSON.stringify({ type: 'module', exports: './index.js' })
    )
    const dependency = join(packageRoot, 'amount.ios.js')
    await writeFile(dependency, 'export const amount = 2')
    await writeFile(join(packageRoot, 'amount.android.js'), 'export const amount = 99')
    await writeFile(
      join(packageRoot, 'index.js'),
      `
import { amount } from './amount'
const instance = globalThis.moduleInitializations = (globalThis.moduleInitializations || 0) + 1
export default function calculate(value) { return value + amount }
export function reads() { return instance }
`
    )
    await writeFile(
      join(root, 'entry.mjs'),
      `
import calculate, { reads } from 'pure-math'
globalThis.calculate = calculate
globalThis.reads = reads
if (import.meta.hot) import.meta.hot.accept(() => {})
`
    )
    const compiler = await import('@vxrn/compiler')
    compiler.configureVXRNCompilerPlugin({
      enableReanimated: true,
      enableNativeWorklets: true,
    })
    let resolveUpdate!: (value: any) => void
    const updated = new Promise<any>((resolve) => {
      resolveUpdate = resolve
    })
    const native = await createNativeDevEngine({
      root,
      port: 0,
      platform: 'ios',
      plugins: [
        workletImportsPlugin({ 'pure-math': ['default', 'reads'] }),
        {
          name: 'worklet-import-fixture',
          transform(_code, id) {
            if (id.endsWith('/__virtual-native-entry.tsx')) return `import './entry.mjs'`
          },
        },
      ],
      onHmrUpdate: resolveUpdate,
    })
    try {
      const initial = await native.getBundle()
      const rn: any = { console, setTimeout, clearTimeout }
      runInNewContext(initial.code, rn)
      expect(rn.calculate(10)).toBe(12)
      expect(rn.reads()).toBe(1)
      const ui: any = createContext({})
      const compiled = new Map<number, Function>()
      const reconstruct = (worklet: any): Function => {
        if (!worklet.__initData || !worklet.__workletHash)
          throw new Error('remote function')
        let fn = compiled.get(worklet.__workletHash)
        if (!fn) {
          fn = runInContext(`(${worklet.__initData.code})`, ui)
          compiled.set(worklet.__workletHash, fn!)
        }
        const closure = Object.fromEntries(
          Object.entries(worklet.__closure).map(([name, value]) => [
            name,
            typeof value === 'function' ? reconstruct(value) : value,
          ])
        )
        return fn!.bind({ __closure: closure })
      }
      expect(() => reconstruct((value: number) => value + 2)).toThrow('remote function')
      const old = reconstruct(rn.calculate)
      const oldReads = reconstruct(rn.reads)
      expect(old(10)).toBe(12)
      expect(reconstruct(rn.calculate)(11)).toBe(13)
      expect(oldReads()).toBe(1)
      expect(rn.reads()).toBe(1)

      const runtime = rn.__rolldown_runtime__
      await native.engine.registerClient(runtime.clientId)
      await writeFile(dependency, 'export const amount = 3')
      const update = await updated
      expect(update.type).toBe('hmr:update')
      expect(runtime.applyHmrUpdate(update.code, update.changedIds, update.seq)).toBe(
        true
      )
      expect(rn.calculate(10)).toBe(13)
      const next = reconstruct(rn.calculate)
      expect([old(10), next(10), old(10), next(10)]).toEqual([12, 13, 12, 13])
      const nextReads = reconstruct(rn.reads)
      expect([oldReads(), nextReads(), oldReads(), nextReads()]).toEqual([1, 2, 1, 2])
      expect(ui.moduleInitializations).toBe(2)
      expect(rn.reads()).toBe(2)

      await writeFile(
        join(root, 'production.mjs'),
        `import calculate, { reads } from 'pure-math'; globalThis.calculate = calculate; globalThis.reads = reads`
      )
      // a production bundle is minified by default, so this also covers worklet
      // closure serialization under mangling: the worklet body is a string
      // literal the minifier leaves alone, and __closure carries its captures
      // by property name, which mangling does not rewrite.
      const production = await buildNativeBundle({
        root,
        platform: 'android',
        entryFile: 'production.mjs',
        plugins: [workletImportsPlugin({ 'pure-math': ['default', 'reads'] })],
      })
      expect(production.code).not.toContain('__esmMin')
      const productionRN: any = { console }
      runInNewContext(production.code, productionRN)
      expect(productionRN.calculate(10)).toBe(109)
      expect(reconstruct(productionRN.calculate)(10)).toBe(109)
      expect(reconstruct(productionRN.reads)()).toBe(3)
      expect(productionRN.reads()).toBe(1)

      const unminifiedProduction = await buildNativeBundle({
        root,
        platform: 'android',
        entryFile: 'production.mjs',
        minify: false,
        plugins: [workletImportsPlugin({ 'pure-math': ['default', 'reads'] })],
      })
      expect(unminifiedProduction.code).toContain('__esmMin')
      const unminifiedRN: any = { console }
      runInNewContext(unminifiedProduction.code, unminifiedRN)
      expect(unminifiedRN.calculate(10)).toBe(109)
      expect(reconstruct(unminifiedRN.calculate)(10)).toBe(109)
      expect(reconstruct(unminifiedRN.reads)()).toBe(3)

      const sharedPlugin = workletImportsPlugin({ 'pure-math': ['default', 'reads'] })
      const parallel = await Promise.all(
        (['ios', 'android'] as const).map(async (platform) => {
          const output = await buildNativeBundle({
            root,
            platform,
            entryFile: 'production.mjs',
            plugins: [sharedPlugin],
          })
          const context: any = { console }
          runInNewContext(output.code, context)
          return context.calculate(10)
        })
      )
      expect(parallel).toEqual([13, 109])
    } finally {
      await native.close()
      compiler.configureVXRNCompilerPlugin({
        enableReanimated: false,
        enableNativeWorklets: false,
      })
      await rm(root, { recursive: true, force: true })
    }
  })

  it.each([
    [
      'unselected',
      'export default function value() { return 1 }; export const other = 2',
      `import { other } from 'pure-math'; globalThis.value = other`,
      /unselected export other/,
    ],
    [
      'missing',
      'export const other = 2',
      `import value from 'pure-math'; globalThis.value = value`,
      /default.*not exported|MISSING_EXPORT/,
    ],
    [
      'builtin',
      `import fs from 'node:fs'; export default function value() { return fs.readFileSync('x') }`,
      `import value from 'pure-math'; globalThis.value = value`,
      /runtime dependency node:fs/,
    ],
    [
      'global',
      'export default function value() { return process.pid }',
      `import value from 'pure-math'; globalThis.value = value`,
      /unsupported runtime globals: process/,
    ],
    [
      'dynamic',
      `export default function value() { return import('./other.js') }`,
      `import value from 'pure-math'; globalThis.value = value`,
      /dynamic imports are unsupported/,
    ],
  ] as const)(
    'rejects %s through the native engine',
    async (_name, source, entry, expected) => {
      const root = await createWorkletsProject(false)
      const packageRoot = join(root, 'node_modules/pure-math')
      await mkdir(packageRoot, { recursive: true })
      await writeFile(
        join(packageRoot, 'package.json'),
        JSON.stringify({ type: 'module', exports: './index.js' })
      )
      await writeFile(join(packageRoot, 'index.js'), source)
      await writeFile(join(root, 'entry.mjs'), entry)
      const compiler = await import('@vxrn/compiler')
      compiler.configureVXRNCompilerPlugin({
        enableReanimated: true,
        enableNativeWorklets: true,
      })
      const native = await createNativeDevEngine({
        root,
        port: 0,
        platform: 'ios',
        plugins: [
          workletImportsPlugin({ 'pure-math': ['default'] }),
          {
            name: 'worklet-import-negative-fixture',
            transform(_code, id) {
              if (id.endsWith('/__virtual-native-entry.tsx'))
                return `import './entry.mjs'`
            },
          },
        ],
      })
      try {
        await expect(native.getBundle()).rejects.toThrow(expected)
      } finally {
        await native.close()
        compiler.configureVXRNCompilerPlugin({
          enableReanimated: false,
          enableNativeWorklets: false,
        })
        await rm(root, { recursive: true, force: true })
      }
    }
  )
})

describe('native Rolldown HMR runtime', () => {
  it.each([true, false])('keeps CommonJS default components callable through the native HMR wire path (Babel=%s)', async (babel) => {
    const root = await mkdtemp(join(tmpdir(), 'vxrn-native-hmr-interop-'))
    const entry = join(root, 'entry.mjs')
    const packageRoot = join(root, 'node_modules/component')
    await mkdir(packageRoot, { recursive: true })
    await writeFile(
      join(packageRoot, 'package.json'),
      JSON.stringify({ main: './component(view).js' })
    )
    await writeFile(
      join(packageRoot, 'component(view).js'),
      babel
        ? `Object.defineProperty(exports, '__esModule', { value: true }); exports.default = function Component() { return 42 }`
        : `module.exports = function Component() { return 42 }`
    )
    const source = (version: number) => `
import Component from 'component'
globalThis.renderComponent = Component
export const version = ${version}
if (import.meta.hot) import.meta.hot.accept(() => {})
`
    await writeFile(entry, source(1))
    let resolveUpdate!: (update: any) => void
    const updateReceived = new Promise<any>((resolve) => { resolveUpdate = resolve })
    const native = await createNativeDevEngine({
      root,
      port: 0,
      platform: 'ios',
      plugins: [{
        name: 'native-hmr-fixture-entry',
        transform(_code, id) {
          if (id.endsWith('/__virtual-native-entry.tsx')) return `import './entry.mjs'`
        },
      }],
      onHmrUpdate: resolveUpdate,
    })
    try {
      const initial = await native.getBundle()
      const context: any = { console, setTimeout, clearTimeout }
      runInNewContext(initial.code, context)
      expect(context.renderComponent()).toBe(42)
      const runtime = context.__rolldown_runtime__
      await native.engine.registerClient(runtime.clientId)
      await writeFile(entry, source(2))
      const update = await updateReceived
      expect(update.type).toBe('hmr:update')
      expect(update.clientId).toBe(runtime.clientId)
      expect(runtime.applyHmrUpdate(update.code, update.changedIds, update.seq)).toBe(true)
      expect(context.renderComponent()).toBe(42)
    } finally {
      await native.close()
      await rm(root, { recursive: true, force: true })
    }
  })

  it(
    'registers a Rolldown 1.2 client and applies a self-accepted patch',
    { timeout: 30_000 },
    async () => {
      const testRoot = await mkdtemp(join(tmpdir(), 'vxrn-native-hmr-'))
      const entry = join(testRoot, 'entry.js')
      const source = (version: string) => `
globalThis.__vxrnHmrBody = '${version}'
export const value = '${version}'
if (import.meta.hot) {
  import.meta.hot.accept((next) => {
    globalThis.__vxrnHmrAccepted = next.value
  })
}
`
      await writeFile(entry, source('v1'))

      let resolveInitialOutput!: (output: any) => void
      const initialOutput = new Promise<any>((resolve) => {
        resolveInitialOutput = resolve
      })
      let resolveHmrUpdate!: (output: any) => void
      const hmrUpdate = new Promise<any>((resolve) => {
        resolveHmrUpdate = resolve
      })
      let registeredClientId: string | undefined
      const engine = await dev(
        {
          cwd: testRoot,
          input: entry,
          experimental: { devMode: { implement: getHmrRuntimeSource() } },
        },
        { format: 'esm' },
        {
          onOutput(result) {
            resolveInitialOutput(result)
          },
          onHmrUpdates(result) {
            if (
              !(result instanceof Error) &&
              result.updates.some(
                (item) =>
                  item.clientId === registeredClientId && item.update.type === 'Patch'
              )
            ) {
              resolveHmrUpdate(result)
            }
          },
        }
      )

      try {
        await engine.run()
        const initial = await initialOutput
        if (initial instanceof Error) throw initial
        const chunk = initial.output.find(
          (item: any) => item.type === 'chunk' && item.isEntry
        )
        expect(chunk).toBeTruthy()

        delete (globalThis as any).__rolldown_runtime__
        await import(
          `data:text/javascript;base64,${Buffer.from(chunk.code).toString('base64')}`
        )
        const runtime = (globalThis as any).__rolldown_runtime__
        expect(typeof runtime.clientId).toBe('string')
        registeredClientId = runtime.clientId
        await engine.registerClient(runtime.clientId)

        await writeFile(entry, source('v2'))
        const result = await Promise.race([
          hmrUpdate,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('timed out waiting for HMR patch')), 10_000)
          ),
        ])
        const patch = result.updates.find(
          (item: any) =>
            item.clientId === runtime.clientId && item.update.type === 'Patch'
        )?.update
        expect(patch).toBeTruthy()

        const applyHmrUpdate = Reflect.get(runtime, 'applyHmrUpdate')
        expect(
          Reflect.apply(applyHmrUpdate, runtime, [
            patch.code,
            patch.changedIds,
            patch.seq,
          ])
        ).toBe(true)
        expect((globalThis as any).__vxrnHmrBody).toBe('v2')
        expect((globalThis as any).__vxrnHmrAccepted).toBe('v2')
      } finally {
        await engine.close()
        await rm(testRoot, { recursive: true, force: true })
        delete (globalThis as any).__rolldown_runtime__
        delete (globalThis as any).__vxrnHmrBody
        delete (globalThis as any).__vxrnHmrAccepted
      }
    }
  )

  it(
    'propagates a non-component update to a React Refresh boundary',
    { timeout: 30_000 },
    async () => {
      const testRoot = await mkdtemp(join(tmpdir(), 'vxrn-native-refresh-boundary-'))
      const entry = join(testRoot, 'entry.js')
      const leaf = join(testRoot, 'leaf.js')
      await writeFile(
        entry,
        `
import { value } from './leaf.js'
globalThis.__vxrnRefreshBoundaryValue = value
export function App() {}
if (import.meta.hot) {
  import.meta.hot.acceptReactRefresh(() => {
    globalThis.__vxrnRefreshBoundaryAccepted = true
  })
}
`
      )
      await writeFile(leaf, `export const value = 'v1'`)

      let resolveInitialOutput!: (output: any) => void
      const initialOutput = new Promise<any>((resolve) => {
        resolveInitialOutput = resolve
      })
      let resolveHmrUpdate!: (output: any) => void
      const hmrUpdate = new Promise<any>((resolve) => {
        resolveHmrUpdate = resolve
      })
      let registeredClientId: string | undefined
      const engine = await dev(
        {
          cwd: testRoot,
          input: entry,
          experimental: { devMode: { implement: getHmrRuntimeSource() } },
        },
        { format: 'esm' },
        {
          onOutput(result) {
            resolveInitialOutput(result)
          },
          onHmrUpdates(result) {
            if (
              !(result instanceof Error) &&
              result.updates.some(
                (item) =>
                  item.clientId === registeredClientId && item.update.type === 'Patch'
              )
            ) {
              resolveHmrUpdate(result)
            }
          },
        }
      )

      const previousRefreshRuntime = Reflect.get(globalThis, '__ReactRefresh')
      Reflect.set(globalThis, '__ReactRefresh', {
        isLikelyComponentType(value: unknown) {
          return typeof value === 'function'
        },
      })

      try {
        await engine.run()
        const initial = await initialOutput
        if (initial instanceof Error) throw initial
        const chunk = initial.output.find(
          (item: any) => item.type === 'chunk' && item.isEntry
        )
        expect(chunk).toBeTruthy()

        Reflect.deleteProperty(globalThis, '__rolldown_runtime__')
        await import(
          `data:text/javascript;base64,${Buffer.from(chunk.code).toString('base64')}`
        )
        const runtime = Reflect.get(globalThis, '__rolldown_runtime__')
        registeredClientId = runtime.clientId
        await engine.registerClient(runtime.clientId)

        await writeFile(leaf, `export const value = 'v2'`)
        const result = await Promise.race([
          hmrUpdate,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('timed out waiting for HMR patch')), 10_000)
          ),
        ])
        const patch = result.updates.find(
          (item: any) =>
            item.clientId === runtime.clientId && item.update.type === 'Patch'
        )?.update
        expect(patch).toBeTruthy()

        const applyHmrUpdate = Reflect.get(runtime, 'applyHmrUpdate')
        expect(
          Reflect.apply(applyHmrUpdate, runtime, [
            patch.code,
            patch.changedIds,
            patch.seq,
          ])
        ).toBe(true)
        expect(Reflect.get(globalThis, '__vxrnRefreshBoundaryValue')).toBe('v2')
        expect(Reflect.get(globalThis, '__vxrnRefreshBoundaryAccepted')).toBe(true)
      } finally {
        await engine.close()
        await rm(testRoot, { recursive: true, force: true })
        Reflect.deleteProperty(globalThis, '__rolldown_runtime__')
        Reflect.deleteProperty(globalThis, '__vxrnRefreshBoundaryValue')
        Reflect.deleteProperty(globalThis, '__vxrnRefreshBoundaryAccepted')
        if (previousRefreshRuntime === undefined) {
          Reflect.deleteProperty(globalThis, '__ReactRefresh')
        } else {
          Reflect.set(globalThis, '__ReactRefresh', previousRefreshRuntime)
        }
      }
    }
  )
})

describe('native production import.meta lowering', () => {
  it('emits a Hermes-compatible bundle for guarded import.meta.env reads', async () => {
    const testRoot = await mkdtemp(join(tmpdir(), 'vxrn-native-import-meta-'))
    await writeFile(
      join(testRoot, 'entry.js'),
      `globalThis.__vxrnNativeImportMetaProbe = typeof import.meta !== 'undefined' && import.meta.env.DEV`
    )

    try {
      const result = await buildNativeBundle({
        root: testRoot,
        platform: 'ios',
        entryFile: 'entry.js',
      })
      expect(result.code).not.toContain('typeof import.meta')

      const context = { globalThis: {}, process: { env: {} } }
      runInNewContext(result.code, context)
      expect(Reflect.get(context.globalThis, '__vxrnNativeImportMetaProbe')).toBe(false)
    } finally {
      await rm(testRoot, { recursive: true, force: true })
    }
  })
})

describe('native animated guard transform', () => {
  it('preserves line count and returns a composable source map', async () => {
    const plugin = nativeAnimatedGuardPlugin()
    if (typeof plugin.transform !== 'function') {
      throw new Error('native animated guard transform hook is not callable')
    }
    const source = [
      'function call(methodName) {',
      '  const method = nullthrows(NativeAnimatedModule)[methodName];',
      '  method();',
      '}',
    ].join('\n')

    const result = await Reflect.apply(plugin.transform, undefined, [
      source,
      '/project/node_modules/react-native/src/private/animated/NativeAnimatedHelper.js',
    ])

    expect(result.code.split('\n')).toHaveLength(source.split('\n').length)
    expect(result.code).toContain("if (typeof method !== 'function') return")
    expect(result.map).toEqual({
      version: 3,
      sources: [
        '/project/node_modules/react-native/src/private/animated/NativeAnimatedHelper.js',
      ],
      sourcesContent: [source],
      names: [],
      mappings: 'AAAA;AACA;AACA;AACA',
    })
  })
})

// use a root with no .env files so only the platform defines are present
const root = '/tmp/vxrn-native-env-define-test-nonexistent'

describe('getNativeTransformConfig platform env defines', () => {
  for (const platform of ['ios', 'android'] as const) {
    for (const dev of [true, false]) {
      it(`injects TAMAGUI_TARGET=native for ${platform} (dev=${dev})`, () => {
        const { define } = getNativeTransformConfig(platform, dev, root)

        // regression: TAMAGUI_TARGET was missing from the rolldown native defines,
        // so import.meta.env.TAMAGUI_TARGET resolved to '' in prod (metro had it, rolldown didn't)
        expect(define['import.meta.env.TAMAGUI_TARGET']).toBe('"native"')
        expect(define['process.env.TAMAGUI_TARGET']).toBe('"native"')
        expect(define['import.meta.env.TAMAGUI_ENVIRONMENT']).toBe(
          JSON.stringify(platform)
        )

        // sibling platform vars that already worked — guard against accidental removal
        expect(define['import.meta.env.VITE_ENVIRONMENT']).toBe(JSON.stringify(platform))
        expect(define['import.meta.env.VITE_NATIVE']).toBe('"1"')
        expect(define['import.meta.env.EXPO_OS']).toBe(JSON.stringify(platform))

        // the whole import.meta.env object (used by JSON.stringify(import.meta.env)) must carry it too
        const envObject = JSON.parse(define['import.meta.env'] as string)
        expect(envObject.TAMAGUI_TARGET).toBe('native')
        expect(envObject.TAMAGUI_ENVIRONMENT).toBe(platform)
      })
    }
  }

  it('inlines EXPO_PUBLIC values supplied by the native build environment', () => {
    const key = 'EXPO_PUBLIC_VXRN_NATIVE_ENV_PROBE'
    const previous = process.env[key]
    process.env[key] = 'native-env-value'

    try {
      const { define } = getNativeTransformConfig('ios', false, root)
      expect(define[`process.env.${key}`]).toBe('"native-env-value"')
      expect(define[`import.meta.env.${key}`]).toBe('"native-env-value"')
      expect(JSON.parse(define['import.meta.env'] as string)[key]).toBe(
        'native-env-value'
      )
    } finally {
      if (previous === undefined) delete process.env[key]
      else process.env[key] = previous
    }
  })

  it('keeps native platform values authoritative over inherited SSR env', () => {
    const previousEnvironment = process.env.VITE_ENVIRONMENT
    const previousNative = process.env.VITE_NATIVE
    process.env.VITE_ENVIRONMENT = 'ssr'
    process.env.VITE_NATIVE = ''

    try {
      const { define } = getNativeTransformConfig('ios', false, root)
      const envObject = JSON.parse(define['import.meta.env'] as string)

      expect(define['process.env.VITE_ENVIRONMENT']).toBe('"ios"')
      expect(define['import.meta.env.VITE_ENVIRONMENT']).toBe('"ios"')
      expect(define['process.env.VITE_NATIVE']).toBe('"1"')
      expect(define['import.meta.env.VITE_NATIVE']).toBe('"1"')
      expect(envObject.VITE_ENVIRONMENT).toBe('ios')
      expect(envObject.VITE_NATIVE).toBe('1')
    } finally {
      if (previousEnvironment === undefined) delete process.env.VITE_ENVIRONMENT
      else process.env.VITE_ENVIRONMENT = previousEnvironment
      if (previousNative === undefined) delete process.env.VITE_NATIVE
      else process.env.VITE_NATIVE = previousNative
    }
  })
})

describe('wrapNativeBundleModuleScope', () => {
  // matches the marker rolldown dev() emits at the start of the runtime region
  const RUNTIME_MARKER = '//#region \\0rolldown/runtime.js'

  it('wraps module code after the prelude so top-level vars do not leak to global', () => {
    const prelude = 'globalThis.global = globalThis;\nglobalThis.__DEV__ = true;\n'
    // a top-level `var Headers` in a script becomes a non-configurable global,
    // which is the exact leak that breaks RN's polyfillGlobal in dev
    const body = `${RUNTIME_MARKER}\nvar fetch_hot, fetch$1, Headers, Request, Response$1;\nglobalThis.__rolldown_runtime__ = {};\n`

    const out = wrapNativeBundleModuleScope(prelude + body)

    const openIdx = out.indexOf(';(function() {')
    expect(openIdx).toBeGreaterThan(-1)
    // prelude (global setup) stays at script scope, before the wrap opens
    expect(out.indexOf('globalThis.__DEV__')).toBeLessThan(openIdx)
    // the leaking declaration is now inside the function scope
    expect(out.indexOf('var fetch_hot')).toBeGreaterThan(openIdx)
    // and the result must still be syntactically valid (balanced wrap)
    expect(() => new Function(out)).not.toThrow()
  })

  it('is a no-op when the runtime marker is absent (e.g. prod bundle)', () => {
    const input = 'var x = 1;\nconsole.log(x);\n'
    expect(wrapNativeBundleModuleScope(input)).toBe(input)
  })
})

describe('getHermesSWCIncludes', () => {
  const CLASS_SET = [
    'transform-classes',
    'transform-parameters',
    'transform-block-scoping',
    'transform-class-properties',
    'transform-class-static-block',
    'transform-private-methods',
    'transform-private-property-in-object',
  ]

  it('always includes the full Hermes class-transform set (dev and prod)', () => {
    // regression: transform-classes was missing in dev, leaving a half-transpiled
    // class hierarchy Hermes crashes on at `new Subclass()`
    expect(getHermesSWCIncludes(true)).toEqual(expect.arrayContaining(CLASS_SET))
    expect(getHermesSWCIncludes(false)).toEqual(expect.arrayContaining(CLASS_SET))
  })

  it('adds transform-async-to-generator in development and production', () => {
    expect(getHermesSWCIncludes(true)).toContain('transform-async-to-generator')
    expect(getHermesSWCIncludes(false)).toContain('transform-async-to-generator')
  })

  it('lowers async generators for the Hermes development interpreter', async () => {
    const plugin = hermesCompatSWCPlugin(true)
    if (typeof plugin.transform !== 'function') {
      throw new Error('Hermes compatibility transform hook is not callable')
    }

    const result = await Reflect.apply(plugin.transform, undefined, [
      'export async function* values() { yield await Promise.resolve(1) }',
      '/project/async-generator.ts',
    ])
    expect(result.code).not.toContain('async function*')
    expect(result.code).not.toContain('async function *')
  })

  it('downlevels private fields, public class fields, and static blocks for Hermes', async () => {
    const plugin = hermesCompatSWCPlugin(true)
    if (typeof plugin.transform !== 'function') {
      throw new Error('Hermes compatibility transform hook is not callable')
    }

    const result = await Reflect.apply(plugin.transform, undefined, [
      `
class TransformProbe {
  #privateField = 1
  publicField = 2
  static {
    TransformProbe.initialized = true
  }

  getSecret() {
    return this.#privateField
  }
}
`,
      '/project/TransformProbe.ts',
    ])

    expect(result.code).not.toContain('#privateField')
    expect(result.code).not.toMatch(/^\s*publicField\s*=/m)
    expect(result.code).not.toContain('static {')
    expect(result.code).toContain('this.publicField = 2')
  })

  it('preserves per-iteration bindings used by lazy method getters', async () => {
    const plugin = hermesCompatSWCPlugin(true)
    if (typeof plugin.transform !== 'function') {
      throw new Error('Hermes compatibility transform hook is not callable')
    }

    const result = await Reflect.apply(plugin.transform, undefined, [
      `
const installedGroups = new WeakMap()
function install(inst, methods) {
  const proto = Object.getPrototypeOf(inst)
  for (const key in methods) {
    const fn = methods[key]
    Object.defineProperty(proto, key, {
      get() { return fn.bind(this) }
    })
  }
}
function Schema() {
  install(this, {
    nullish() { return 'nullish' },
    apply(fn) { return fn(this) }
  })
}
globalThis.__vxrnBlockScopeProbe = new Schema().nullish()
`,
      '/project/block-scope-loop.ts',
    ])

    try {
      new Function(result.code)()
      expect(Reflect.get(globalThis, '__vxrnBlockScopeProbe')).toBe('nullish')
    } finally {
      Reflect.deleteProperty(globalThis, '__vxrnBlockScopeProbe')
    }
  })

  it('bundles lowered classes whose constructors use default and rest parameters', async () => {
    const testRoot = await mkdtemp(join(tmpdir(), 'vxrn-hermes-parameters-'))
    const entry = join(testRoot, 'entry.js')
    await writeFile(
      entry,
      `
class ParameterProbe {
  prefix = 'value'

  constructor(value = 'default', ...rest) {
    this.result = [this.prefix, value, ...rest].join(':')
  }
}

export const result = new ParameterProbe(undefined, 'rest-a', 'rest-b').result
`
    )

    const build = await rolldown({
      input: entry,
      plugins: [hermesCompatSWCPlugin(true)],
    })

    try {
      const output = await build.generate({ format: 'esm' })
      const chunk = output.output.find((item) => item.type === 'chunk')
      expect(chunk).toBeTruthy()
      if (!chunk) throw new Error('Rolldown did not emit a JavaScript chunk')

      const module = await import(
        `data:text/javascript;base64,${Buffer.from(chunk.code).toString('base64')}`
      )
      expect(module.result).toBe('value:default:rest-a:rest-b')
    } finally {
      await build.close()
      await rm(testRoot, { recursive: true, force: true })
    }
  })
})

describe('hmrClientNoopPlugin', () => {
  const plugin = hmrClientNoopPlugin()
  const resolveId = plugin.resolveId as unknown as (
    source: string,
    importer?: string
  ) => any
  const load = plugin.load as unknown as (id: string) => any
  const VIRTUAL_ID = '\0vxrn-hmr-client-noop'

  it.each([
    ['react-native/Libraries/Utilities/HMRClient', undefined],
    ['../Utilities/HMRClient', '/project/node_modules/react-native/Libraries/Core.js'],
    ['../../Utilities/HMRClient.js', '/project/react-native/Libraries/Core.js'],
    // native Windows ids use backslashes
    ['..\\Utilities\\HMRClient.js', 'C:\\project\\react-native\\Libraries\\Core.js'],
    ['../Utilities/HMRClient.ts', '/project/node_modules/react-native/Core.js'],
    ['../Utilities/HMRClient.tsx', '/project/node_modules/react-native/Core.js'],
    ['../Utilities/HMRClient.cjs', '/project/node_modules/react-native/Core.js'],
  ])(
    'aliases RN HMRClient specifier %j to the no-op virtual module',
    (source, importer) => {
      expect(resolveId(source, importer)).toEqual({ id: VIRTUAL_ID, external: false })
    }
  )

  it.each([
    // trailing letters (no boundary) must not match
    'react-native/Libraries/Utilities/HMRClientRegistry',
    // the Utilities segment must start at a path boundary
    'some/MyUtilities/HMRClient',
    // unrelated RN modules
    'react-native/Libraries/Core/setUpDeveloperTools',
    'react',
  ])('does not touch unrelated specifier %j', (source) => {
    expect(resolveId(source)).toBeUndefined()
  })

  it('does not alias an app-authored Utilities/HMRClient module', () => {
    expect(resolveId('../Utilities/HMRClient', '/project/src/App.tsx')).toBeUndefined()
  })

  it('loads a no-op module exposing every HMRClient method RN calls', () => {
    const result = load(VIRTUAL_ID)
    expect(result?.moduleType).toBe('js')
    for (const method of [
      'setup',
      'enable',
      'disable',
      'registerBundle',
      'log',
      'isEnabled',
    ]) {
      expect(result!.code).toContain(method)
    }
    expect(result!.code).toContain('export default HMRClient')
  })

  it('does not load unrelated ids', () => {
    expect(load('\0some-other-virtual')).toBeUndefined()
  })
})

describe('vxrnCompilerPlugin React Refresh registration', () => {
  it('keeps initial-bundle registrations visible to rolldown', async () => {
    const previousNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'test'
    try {
      const plugin = vxrnCompilerPlugin('ios', true)
      const transform = plugin.transform as (code: string, id: string) => Promise<any>
      const result = await transform(
        'export const marker = "$RefreshReg$("; export function Probe() { return <div>probe</div> }',
        '/project/src/Probe.tsx'
      )
      const code = result.code as string

      expect(code).toContain('var __vxrnRefreshReg = globalThis.$RefreshReg$')
      expect(code).toContain('__vxrnRefreshReg(')
      expect(code).toContain('"$RefreshReg$("')
      expect(code).toContain('import.meta.hot.acceptReactRefresh(')
    } finally {
      process.env.NODE_ENV = previousNodeEnv
    }
  })
})

describe('native required transform failures', () => {
  it.each([true, false])(
    'rejects valid worklet source when its required compiler transform fails (dev=%s)',
    async (dev) => {
      const testRoot = await createWorkletsProject()
      const compiler = await import('@vxrn/compiler')
      const spy = vi
        .spyOn(compiler, 'transformWorklets')
        .mockRejectedValue(new Error('NATIVE_TRANSFORM_NEGATIVE_CONTROL'))
      compiler.configureVXRNCompilerPlugin({ enableReanimated: true })

      try {
        const plugin = vxrnCompilerPlugin('ios', dev, testRoot)
        if (typeof plugin.transform !== 'function') {
          throw new Error('vxrn compiler transform hook is not callable')
        }

        await expect(
          Reflect.apply(plugin.transform, undefined, [
            nativeTransformProbe,
            join(testRoot, 'entry.ts'),
          ])
        ).rejects.toThrow('NATIVE_TRANSFORM_NEGATIVE_CONTROL')
      } finally {
        spy.mockRestore()
        compiler.configureVXRNCompilerPlugin({ enableReanimated: false })
        await rm(testRoot, { recursive: true, force: true })
      }
    }
  )

  it('returns a dev build error and no output when the required compiler transform fails', async () => {
    const testRoot = await createWorkletsProject()
    const compiler = await import('@vxrn/compiler')
    const spy = vi
      .spyOn(compiler, 'transformWorklets')
      .mockRejectedValue(new Error('NATIVE_TRANSFORM_NEGATIVE_CONTROL'))
    compiler.configureVXRNCompilerPlugin({ enableReanimated: true })
    let resolveOutput!: (output: unknown) => void
    const output = new Promise<unknown>((resolve) => {
      resolveOutput = resolve
    })
    const engine = await dev(
      {
        cwd: testRoot,
        input: join(testRoot, 'entry.ts'),
        plugins: [vxrnCompilerPlugin('ios', true, testRoot)],
      },
      { format: 'esm' },
      { onOutput: resolveOutput }
    )

    try {
      await engine.run()
      const result = await output
      expect(result).toBeInstanceOf(Error)
      expect(String(result)).toContain('NATIVE_TRANSFORM_NEGATIVE_CONTROL')
    } finally {
      spy.mockRestore()
      await engine.close()
      compiler.configureVXRNCompilerPlugin({ enableReanimated: false })
      await rm(testRoot, { recursive: true, force: true })
    }
  })

  it('emits no production bundle when the required compiler transform fails', async () => {
    const testRoot = await createWorkletsProject()
    const compiler = await import('@vxrn/compiler')
    const spy = vi
      .spyOn(compiler, 'transformWorklets')
      .mockRejectedValue(new Error('NATIVE_TRANSFORM_NEGATIVE_CONTROL'))
    compiler.configureVXRNCompilerPlugin({ enableReanimated: true })

    try {
      await expect(
        buildNativeBundle({
          root: testRoot,
          platform: 'ios',
          entryFile: 'entry.ts',
        })
      ).rejects.toThrow('NATIVE_TRANSFORM_NEGATIVE_CONTROL')
    } finally {
      spy.mockRestore()
      compiler.configureVXRNCompilerPlugin({ enableReanimated: false })
      await rm(testRoot, { recursive: true, force: true })
    }
  })

  it('rejects Hermes compatibility transform errors instead of returning source', async () => {
    const plugin = hermesCompatSWCPlugin(true)
    if (typeof plugin.transform !== 'function') {
      throw new Error('Hermes compatibility transform hook is not callable')
    }

    await expect(
      Reflect.apply(plugin.transform, undefined, [
        'class TransformProbe { value = ; }',
        '/project/TransformProbe.ts',
      ])
    ).rejects.toBeTruthy()
  })

  it('returns maps for every required production transform', async () => {
    const testRoot = await createWorkletsProject(false)
    const compiler = await import('@vxrn/compiler')
    compiler.configureVXRNCompilerPlugin({ enableReanimated: true })

    try {
      const compilerPlugin = vxrnCompilerPlugin('ios', false, testRoot, true)
      if (typeof compilerPlugin.transform !== 'function') {
        throw new Error('vxrn compiler transform hook is not callable')
      }
      const compilerResult = await Reflect.apply(compilerPlugin.transform, undefined, [
        nativeTransformProbe,
        join(testRoot, 'entry.ts'),
      ])
      expect(compilerResult.map).toBeTruthy()

      const hermesPlugin = hermesCompatSWCPlugin(false, true)
      if (typeof hermesPlugin.transform !== 'function') {
        throw new Error('Hermes compatibility transform hook is not callable')
      }
      const hermesResult = await Reflect.apply(hermesPlugin.transform, undefined, [
        'export class TransformProbe { value = 1 }',
        join(testRoot, 'TransformProbe.ts'),
      ])
      expect(hermesResult.map).toBeTruthy()
    } finally {
      compiler.configureVXRNCompilerPlugin({ enableReanimated: false })
      await rm(testRoot, { recursive: true, force: true })
    }
  })

  it('composes source maps across React Compiler, Fast Refresh, and module wrapper back to original source lines', async () => {
    const { TraceMap, originalPositionFor } = await import('@jridgewell/trace-mapping')
    const compiler = await import('@vxrn/compiler')
    compiler.configureVXRNCompilerPlugin({ enableCompiler: true })

    try {
      const plugin = vxrnCompilerPlugin('ios', true, '/project', true)
      if (typeof plugin.transform !== 'function') {
        throw new Error('transform hook not callable')
      }

      const inputCode = `import { useState } from 'react'

export function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(count + 1)}>{count}</button>
}
`
      const id = '/project/Counter.tsx'
      const result = await Reflect.apply(plugin.transform, undefined, [inputCode, id])

      expect(result).toBeDefined()
      expect(result.map).toBeDefined()

      const tracer = new TraceMap(result.map)
      const lines = result.code.split('\n')
      const counterLineIndex = lines.findIndex((l: string) =>
        l.includes('function Counter')
      )
      expect(counterLineIndex).toBeGreaterThan(0)

      const pos = originalPositionFor(tracer, {
        line: counterLineIndex + 1,
        column: 16,
      })

      expect(pos.source).toBe(id)
      expect(pos.line).toBe(3)
    } finally {
      compiler.configureVXRNCompilerPlugin({ enableCompiler: false })
    }
  })

  it('composes source maps accurately across mixed path (React Compiler + Babel + Fast Refresh + module wrapper)', async () => {
    const { TraceMap, originalPositionFor } = await import('@jridgewell/trace-mapping')
    const compiler = await import('@vxrn/compiler')
    const origEnv = process.env.VXRN_USE_BABEL_FOR_GENERATORS
    process.env.VXRN_USE_BABEL_FOR_GENERATORS = '1'
    compiler.configureVXRNCompilerPlugin({
      enableCompiler: true,
      enableReanimated: false,
    })

    try {
      const plugin = vxrnCompilerPlugin('ios', true, '/project', true)
      if (typeof plugin.transform !== 'function') {
        throw new Error('transform hook not callable')
      }

      const inputCode = `export function Counter() { return <View />; }







export async function* probe() { throw new Error("MARKER"); }
`
      const id = '/project/Counter.tsx'
      const result = await Reflect.apply(plugin.transform, undefined, [inputCode, id])

      expect(result).toBeDefined()
      expect(result.map).toBeDefined()
      // Assert that Babel's generator downleveling actually executed
      expect(
        result.code.includes('_wrapAsyncGenerator') ||
          result.code.includes('regeneratorRuntime')
      ).toBe(true)

      const tracer = new TraceMap(result.map)
      const lines = result.code.split('\n')
      const markerLineIndex = lines.findIndex((l: string) => l.includes('MARKER'))
      expect(markerLineIndex).toBeGreaterThan(0)
      const markerCol = lines[markerLineIndex].indexOf('throw')

      const pos = originalPositionFor(tracer, {
        line: markerLineIndex + 1,
        column: markerCol,
      })

      expect(pos.source).toBe(id)
      expect(pos.line).toBe(9)
      expect(pos.column).toBe(33)

      // Negative control: verify that remapping through compilerOut.map a second time
      // (the prior double-composition bug) breaks the trace and returns null source/line.
      const compilerOut = await compiler.transformOxcReactCompiler(
        id,
        inputCode,
        '19',
        true
      )
      const remapping = (await import('@jridgewell/remapping')).default
      const doubleComposedMap = remapping(
        [result.map as any, compilerOut.map as any],
        () => null
      )
      const badTracer = new TraceMap(doubleComposedMap as any)
      const badPos = originalPositionFor(badTracer, {
        line: markerLineIndex + 1,
        column: markerCol,
      })
      expect(badPos.source).toBeNull()
      expect(badPos.line).toBeNull()
    } finally {
      compiler.configureVXRNCompilerPlugin({ enableCompiler: false })
      if (origEnv !== undefined) {
        process.env.VXRN_USE_BABEL_FOR_GENERATORS = origEnv
      } else {
        delete process.env.VXRN_USE_BABEL_FOR_GENERATORS
      }
    }
  })

  it('transforms worklets via native Rust/Wasm SWC with zero Babel execution and accurate sourcemaps', async () => {
    const { TraceMap, originalPositionFor } = await import('@jridgewell/trace-mapping')
    const compiler = await import('@vxrn/compiler')
    const { vi } = await import('vitest')
    const babelSpy = vi.spyOn(compiler, 'transformBabel')

    compiler.configureVXRNCompilerPlugin({
      enableReanimated: true,
      enableNativeWorklets: true,
      enableCompiler: false,
    })

    try {
      const projectRoot = process.cwd()
      const plugin = vxrnCompilerPlugin('ios', true, projectRoot, true)
      if (typeof plugin.transform !== 'function') {
        throw new Error('transform hook not callable')
      }

      const inputCode = `import { useAnimatedStyle } from 'react-native-reanimated'

export function Box() {
  const animatedStyle = useAnimatedStyle(() => {
    return { opacity: 1 }
  })
  return <div style={animatedStyle} />
}
`
      const id = join(projectRoot, 'Box.tsx')
      const result = await Reflect.apply(plugin.transform, undefined, [inputCode, id])

      expect(result).toBeDefined()
      expect(result.code).toContain('__workletHash')
      expect(result.code).toContain('__closure')
      // Zero Babel calls!
      expect(babelSpy).not.toHaveBeenCalled()

      // Source map tracing
      expect(result.map).toBeDefined()
      const tracer = new TraceMap(result.map)
      const lines = result.code.split('\n')
      const boxLineIndex = lines.findIndex((l: string) =>
        l.includes('export function Box')
      )
      expect(boxLineIndex).toBeGreaterThan(0)

      const pos = originalPositionFor(tracer, {
        line: boxLineIndex + 1,
        column: 16,
      })

      expect(pos.source).toBe(id)
      expect(pos.line).toBe(3)
    } finally {
      babelSpy.mockRestore()
      compiler.configureVXRNCompilerPlugin({
        enableReanimated: false,
        enableNativeWorklets: false,
      })
    }
  })

  it('retains the existing Babel backend by default when enableNativeWorklets is false for auto-detected Reanimated and ordinary configured worklets plugin', async () => {
    const compiler = await import('@vxrn/compiler')
    const { vi } = await import('vitest')
    const babelSpy = vi.spyOn(compiler, 'transformBabel').mockResolvedValue({
      code: '/* babel transformed */',
    } as any)
    const workletSpy = vi.spyOn(compiler, 'transformWorklets')

    // enableReanimated is auto-detected, but enableNativeWorklets is NOT explicitly enabled
    compiler.configureVXRNCompilerPlugin({
      enableReanimated: true,
      enableNativeWorklets: false,
    })

    const getBabelOptionsSpy = vi.spyOn(compiler, 'getBabelOptions').mockReturnValue({
      plugins: ['react-native-reanimated/plugin'],
    } as any)

    try {
      const projectRoot = process.cwd()
      const plugin = vxrnCompilerPlugin('ios', true, projectRoot, false)
      if (typeof plugin.transform !== 'function') {
        throw new Error('transform hook not callable')
      }

      const inputCode = `export function fn() { 'worklet'; return 1 }`
      const id = join(projectRoot, 'DefaultWorklet.tsx')
      const result = await Reflect.apply(plugin.transform, undefined, [inputCode, id])

      expect(result).toBeDefined()
      // Retained existing Babel backend: Babel was called with the plugin
      expect(babelSpy).toHaveBeenCalledWith(
        id,
        inputCode,
        expect.objectContaining({
          plugins: expect.arrayContaining(['react-native-reanimated/plugin']),
        })
      )
      // Native SWC was NOT called
      expect(workletSpy).not.toHaveBeenCalled()
    } finally {
      babelSpy.mockRestore()
      workletSpy.mockRestore()
      getBabelOptionsSpy.mockRestore()
      compiler.configureVXRNCompilerPlugin({
        enableReanimated: false,
        enableNativeWorklets: false,
      })
    }
  })

  it('intercepts tuple worklet plugins with options, executes native SWC with options, and skips Babel when enableNativeWorklets is true', async () => {
    const compiler = await import('@vxrn/compiler')
    const { vi } = await import('vitest')
    const babelSpy = vi.spyOn(compiler, 'transformBabel')
    const workletSpy = vi.spyOn(compiler, 'transformWorklets')

    compiler.configureVXRNCompilerPlugin({
      enableReanimated: true,
      enableNativeWorklets: true,
    })

    const getBabelOptionsSpy = vi.spyOn(compiler, 'getBabelOptions').mockReturnValue({
      plugins: [['react-native-reanimated/plugin', { globals: ['customGlobal'] }]],
    } as any)

    try {
      const projectRoot = process.cwd()
      const plugin = vxrnCompilerPlugin('ios', true, projectRoot, false)
      if (typeof plugin.transform !== 'function') {
        throw new Error('transform hook not callable')
      }

      const inputCode = `export function fn() { 'worklet'; return customGlobal * 2 }`
      const id = join(projectRoot, 'TupleWorklet.tsx')
      const result = await Reflect.apply(plugin.transform, undefined, [inputCode, id])

      expect(result).toBeDefined()
      expect(result.code).toContain('__workletHash')
      // Forwarded options
      expect(workletSpy).toHaveBeenCalledWith(
        id,
        expect.any(String),
        false,
        expect.objectContaining({ globals: ['customGlobal'], projectRoot })
      )
      // Babel was completely skipped
      expect(babelSpy).not.toHaveBeenCalled()
    } finally {
      babelSpy.mockRestore()
      workletSpy.mockRestore()
      getBabelOptionsSpy.mockRestore()
      compiler.configureVXRNCompilerPlugin({
        enableReanimated: false,
        enableNativeWorklets: false,
      })
    }
  })
})

describe('native production minification', () => {
  // a cjs dependency reached through an esm module, a top-level export, and a
  // runtime result that depends on both. minification mangles every top-level
  // name here and drops every comment, which is what the bundle's
  // post-processing reads, so a pass that runs on minified output stops
  // applying — silently for the commonjs interop, and fatally for the `export`
  // statement, which hermes cannot parse.
  async function writeMinifyFixture() {
    const root = await mkdtemp(join(tmpdir(), 'vxrn-native-minify-'))
    const dep = join(root, 'node_modules', 'legacy-color')
    await mkdir(dep, { recursive: true })
    await writeFile(
      join(dep, 'package.json'),
      JSON.stringify({ name: 'legacy-color', main: 'index.js' })
    )
    await writeFile(
      join(dep, 'index.js'),
      `function LegacyColor(value) { this.value = value }
LegacyColor.prototype.describe = function () { return 'legacy:' + this.value }
module.exports = LegacyColor`
    )
    await writeFile(
      join(root, 'views.js'),
      `'use strict';
import LegacyColor from 'legacy-color'
import { level } from './entry.js'
export const describeHeader = () => new LegacyColor(level()).describe()`
    )
    await writeFile(
      join(root, 'entry.js'),
      `import { describeHeader } from './views.js'
export const level = () => 'header'
globalThis.minifyProbe = describeHeader()`
    )
    return root
  }

  function runFixture(code: string) {
    const context: Record<string, unknown> = { console }
    runInNewContext(code, context)
    return Reflect.get(context, 'minifyProbe')
  }

  it('minifies when asked, leaves the bundle alone when not, and both behave the same', async () => {
    const root = await writeMinifyFixture()
    try {
      const [plain, minified] = await Promise.all(
        [false, true].map((minify) =>
          buildNativeBundle({ root, platform: 'ios', entryFile: 'entry.js', minify })
        )
      )

      // the unminified bundle keeps rolldown's generated names and layout
      expect(plain.code).toContain('__toESM')
      expect(plain.code).toContain('describeHeader')
      expect(plain.code.split('\n').length).toBeGreaterThan(40)

      // the minified one keeps neither
      expect(minified.code).not.toContain('describeHeader')
      expect(minified.code).not.toContain('//#region')
      expect(minified.code.length).toBeLessThan(plain.code.length * 0.7)

      // and both still run, with the same result. before the post-processing
      // moved inside the bundle, the minified one threw on its surviving
      // `export {}` statement.
      expect(runFixture(minified.code)).toBe('legacy:header')
      expect(runFixture(plain.code)).toBe('legacy:header')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('defaults to react native\'s rule: minify a production bundle, never a dev one', async () => {
    const root = await writeMinifyFixture()
    try {
      const [prod, devBundle, explicitOff] = await Promise.all([
        buildNativeBundle({ root, platform: 'ios', entryFile: 'entry.js' }),
        buildNativeBundle({ root, platform: 'ios', entryFile: 'entry.js', dev: true }),
        buildNativeBundle({
          root,
          platform: 'ios',
          entryFile: 'entry.js',
          minify: false,
        }),
      ])

      expect(prod.code).not.toContain('describeHeader')
      expect(devBundle.code).toContain('describeHeader')
      expect(explicitOff.code).toContain('describeHeader')
      expect(prod.code.length).toBeLessThan(explicitOff.code.length)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})

describe('native production assets', () => {
  it('registers scale siblings and keeps monorepo assets inside assetsDest', async () => {
    const testRoot = await mkdtemp(join(tmpdir(), 'vxrn-native-assets-'))
    const appRoot = join(testRoot, 'workspace/apps/native-app')
    const appAssets = join(appRoot, 'assets')
    const packageAssets = join(testRoot, 'workspace/node_modules/example/assets')
    const assetsDest = join(testRoot, 'output')
    await mkdir(appAssets, { recursive: true })
    await mkdir(packageAssets, { recursive: true })
    await writeFile(join(appAssets, 'icon.png'), 'icon-1x')
    await writeFile(join(appAssets, 'icon@2x.png'), 'icon-2x')
    await writeFile(join(appAssets, 'icon@3x.png'), 'icon-3x')
    await writeFile(join(packageAssets, 'back.png'), 'back-1x')
    await writeFile(join(packageAssets, 'back@2x.png'), 'back-2x')
    await writeFile(
      join(appRoot, 'entry.js'),
      `
import icon from './assets/icon.png'
import back from '../../node_modules/example/assets/back.png'
globalThis.__nativeAssetProbe = [icon, back]
`
    )

    try {
      const assetData = await getNativeAssetData(
        join(appAssets, 'icon.png'),
        appRoot,
        'ios'
      )
      expect(assetData.scales).toEqual([1, 2, 3])
      expect(assetData.files.map((file) => file.slice(appAssets.length + 1))).toEqual([
        'icon.png',
        'icon@2x.png',
        'icon@3x.png',
      ])
      expect(assetData.hash).not.toBe('')

      const registry = createNativeDevAssetRegistry()
      registry.register(assetData)
      expect(
        registry.resolve('/assets/assets/icon@2x.png', assetData.hash)?.filePath
      ).toBe(join(appAssets, 'icon@2x.png'))
      expect(
        registry.resolve('/assets/assets/icon.png', 'stale-content-hash')
      ).toBeUndefined()
      expect(
        registry.resolve('/assets/../../package.json', assetData.hash)
      ).toBeUndefined()

      const result = await buildNativeBundle({
        root: appRoot,
        platform: 'ios',
        entryFile: 'entry.js',
        assetsDest,
      })

      const registered: Array<{ name: string; scales: number[] }> = []
      runInNewContext(result.code, {
        console,
        require: (id: string) =>
          id === 'react-native/Libraries/Image/AssetRegistry'
            ? {
                registerAsset: (asset: { name: string; scales: number[] }) => {
                  registered.push(asset)
                  return asset
                },
              }
            : {},
      })
      expect(registered.map((asset) => [asset.name, asset.scales])).toEqual([
        ['icon', [1, 2, 3]],
        ['back', [1, 2]],
      ])
      for (const file of ['icon.png', 'icon@2x.png', 'icon@3x.png']) {
        expect(existsSync(join(assetsDest, 'assets/assets', file))).toBe(true)
      }
      for (const file of ['back.png', 'back@2x.png']) {
        expect(
          existsSync(join(assetsDest, 'assets/_/_/node_modules/example/assets', file))
        ).toBe(true)
      }

      // the old path join normalized ../../ out of assetsDest.
      expect(existsSync(join(testRoot, 'node_modules/example/assets/back.png'))).toBe(
        false
      )
    } finally {
      await rm(testRoot, { recursive: true, force: true })
    }
  })
})

describe('native conditional exports', () => {
  it('uses the require condition for CommonJS calls', async () => {
    const testRoot = await mkdtemp(join(tmpdir(), 'vxrn-native-conditions-'))
    const packageRoot = join(testRoot, 'node_modules/conditional-helper')
    await mkdir(packageRoot, { recursive: true })
    await writeFile(
      join(packageRoot, 'package.json'),
      JSON.stringify({
        name: 'conditional-helper',
        exports: {
          '.': {
            import: './esm.js',
            require: './cjs.cjs',
          },
        },
        type: 'module',
      })
    )
    await writeFile(
      join(packageRoot, 'esm.js'),
      `export default function helper() { return 'import' }`
    )
    await writeFile(
      join(packageRoot, 'cjs.cjs'),
      `module.exports = function helper() { return 'require' }`
    )
    await writeFile(
      join(testRoot, 'entry.cjs'),
      `
const helper = require('conditional-helper')
globalThis.__vxrnConditionalExportProbe = helper()
`
    )

    try {
      const result = await buildNativeBundle({
        root: testRoot,
        platform: 'ios',
        entryFile: 'entry.cjs',
        dev: true,
      })
      const context = {
        clearTimeout,
        console,
        process: { env: {} },
        setTimeout,
      }
      runInNewContext(result.code, context)
      expect(Reflect.get(context, '__vxrnConditionalExportProbe')).toBe('require')
    } finally {
      await rm(testRoot, { recursive: true, force: true })
    }
  })

  it(
    'unwraps the default export of Babel CommonJS modules in dev output',
    { timeout: 30_000 },
    async () => {
      const testRoot = await mkdtemp(join(tmpdir(), 'vxrn-native-cjs-default-'))
      const packageRoot = join(testRoot, 'node_modules/default-export-helper')
      await mkdir(packageRoot, { recursive: true })
      await writeFile(
        join(packageRoot, 'package.json'),
        JSON.stringify({ name: 'default-export-helper', main: './index.js' })
      )
      await writeFile(
        join(packageRoot, 'index.js'),
        `Object.defineProperty(exports, '__esModule', { value: true }); exports.default = function Component() {}`
      )
      await writeFile(
        join(testRoot, 'entry.js'),
        `import Component from 'default-export-helper'; globalThis.__vxrnCjsDefaultProbe = typeof Component`
      )

      let resolveOutput!: (output: Error | RolldownOutput) => void
      const output = new Promise<Error | RolldownOutput>((resolve) => {
        resolveOutput = resolve
      })
      const engine = await dev(
        {
          cwd: testRoot,
          input: join(testRoot, 'entry.js'),
          experimental: { devMode: { implement: getHmrRuntimeSource() } },
        },
        { format: 'esm', codeSplitting: false, strictExecutionOrder: true },
        { onOutput: resolveOutput }
      )

      try {
        await engine.run()
        const result = await output
        if (result instanceof Error) throw result
        const chunk = result.output.find((item) => item.type === 'chunk' && item.isEntry)
        if (!chunk || chunk.type !== 'chunk') {
          throw new Error('Rolldown did not emit a native dev entry chunk')
        }

        // Calibrate the exact Rolldown node-mode form observed in the app: it
        // must expose the Babel exports object before the integration fix.
        const nodeModeCode = chunk.code.replace(
          /(\b__toESM(?:\$\d+)?\(\s*require[\w$]*\(\)\s*)\)/,
          '$1, 1)'
        )
        expect(nodeModeCode).not.toBe(chunk.code)

        Reflect.deleteProperty(globalThis, '__rolldown_runtime__')
        await import(
          `data:text/javascript;base64,${Buffer.from(nodeModeCode).toString('base64')}`
        )
        expect(Reflect.get(globalThis, '__vxrnCjsDefaultProbe')).toBe('object')

        Reflect.deleteProperty(globalThis, '__rolldown_runtime__')
        Reflect.deleteProperty(globalThis, '__vxrnCjsDefaultProbe')
        const normalized = normalizeNativeCommonJSInterop(nodeModeCode)
        await import(
          `data:text/javascript;base64,${Buffer.from(normalized).toString('base64')}`
        )
        expect(Reflect.get(globalThis, '__vxrnCjsDefaultProbe')).toBe('function')
      } finally {
        await engine.close()
        Reflect.deleteProperty(globalThis, '__rolldown_runtime__')
        Reflect.deleteProperty(globalThis, '__vxrnCjsDefaultProbe')
        await rm(testRoot, { recursive: true, force: true })
      }
    }
  )

  it('unwraps the default export of Babel CommonJS modules in production output', async () => {
    const testRoot = await mkdtemp(join(tmpdir(), 'vxrn-native-prod-cjs-default-'))
    const packageRoot = join(testRoot, 'node_modules/default-export-helper')
    await mkdir(packageRoot, { recursive: true })
    await writeFile(
      join(packageRoot, 'package.json'),
      JSON.stringify({ name: 'default-export-helper', main: './index.js' })
    )
    await writeFile(
      join(packageRoot, 'index.js'),
      `Object.defineProperty(exports, '__esModule', { value: true }); exports.default = function Component() {}`
    )
    await writeFile(
      join(testRoot, 'entry.js'),
      `import Component from 'default-export-helper'; globalThis.__vxrnProdCjsDefaultProbe = typeof Component`
    )

    try {
      const result = await buildNativeBundle({
        root: testRoot,
        platform: 'ios',
        entryFile: 'entry.js',
      })
      const context = {
        clearTimeout,
        console,
        process: { env: {} },
        setTimeout,
      }
      runInNewContext(result.code, context)
      expect(Reflect.get(context, '__vxrnProdCjsDefaultProbe')).toBe('function')
    } finally {
      await rm(testRoot, { recursive: true, force: true })
    }
  })
})

describe('native Flow sources', () => {
  it.each(['', `/* ${'license text '.repeat(150)} */\n`])('strips third-party Flow following a license header (%#)', async (license) => {
    const testRoot = await mkdtemp(join(tmpdir(), 'vxrn-native-flow-'))
    // mirrors @react-native-masked-view/masked-view: a Flow `.js` component
    // outside the react-native / @react-native scopes, which is what reached
    // rolldown unstripped when its patch was skipped.
    const packageRoot = join(testRoot, 'node_modules/@flowy-scope/flowy-lib')
    await mkdir(packageRoot, { recursive: true })
    await writeFile(
      join(packageRoot, 'package.json'),
      JSON.stringify({ name: '@flowy-scope/flowy-lib', main: './js/Flowy.js' })
    )
    await mkdir(join(packageRoot, 'js'), { recursive: true })
    await writeFile(
      join(packageRoot, 'js/Flowy.js'),
      `${license}/**
 * @flow
 * @format
 */

type FlowyProps = {|
  +value: number,
|}

export default class Flowy {
  _seen: boolean = false

  measure(props: FlowyProps): number {
    const { value, ...rest }: FlowyProps = props
    this._seen = true
    return ((value: any): number) + Object.keys(rest).length
  }
}
`
    )
    await writeFile(
      join(testRoot, 'entry.js'),
      `import Flowy from '@flowy-scope/flowy-lib'
globalThis.__vxrnFlowProbe = new Flowy().measure({ value: 41 }) + 1
`
    )

    try {
      const result = await buildNativeBundle({
        root: testRoot,
        platform: 'ios',
        entryFile: 'entry.js',
      })
      const context = { clearTimeout, console, process: { env: {} }, setTimeout }
      runInNewContext(result.code, context)
      expect(Reflect.get(context, '__vxrnFlowProbe')).toBe(42)
    } finally {
      await rm(testRoot, { recursive: true, force: true })
    }
  })
})
