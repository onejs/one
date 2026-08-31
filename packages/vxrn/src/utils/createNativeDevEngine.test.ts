import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import { rolldown, type RolldownOutput } from 'rolldown'
import { dev } from 'rolldown/experimental'
import { describe, expect, it } from 'vitest'
import { getNativePrelude } from '../runtime/native-prelude'
import {
  buildNativeBundle,
  createNativeDevAssetRegistry,
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
} from './createNativeDevEngine'

const nativeTransformProbe = `
export const transformProbe = () => {
  'worklet'
  return 'transformed'
}
`

async function createWorkletsProject(throwOnTransform = true) {
  const testRoot = await mkdtemp(join(tmpdir(), 'vxrn-native-transform-failure-'))
  const packageRoot = join(testRoot, 'node_modules/react-native-worklets')
  await mkdir(packageRoot, { recursive: true })
  await writeFile(
    join(packageRoot, 'package.json'),
    JSON.stringify({ name: 'react-native-worklets' })
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

describe('native Rolldown HMR runtime', () => {
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
        compiler.configureVXRNCompilerPlugin({ enableReanimated: false })
        await rm(testRoot, { recursive: true, force: true })
      }
    }
  )

  it('returns a dev build error and no output when the required compiler transform fails', async () => {
    const testRoot = await createWorkletsProject()
    const compiler = await import('@vxrn/compiler')
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
      await engine.close()
      compiler.configureVXRNCompilerPlugin({ enableReanimated: false })
      await rm(testRoot, { recursive: true, force: true })
    }
  })

  it('emits no production bundle when the required compiler transform fails', async () => {
    const testRoot = await createWorkletsProject()
    const compiler = await import('@vxrn/compiler')
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

      expect(result.code).toMatch(/"scales":\s*\[\s*1,\s*2,\s*3\s*\]/)
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
