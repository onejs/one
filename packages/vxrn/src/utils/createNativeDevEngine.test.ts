import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parse } from '@swc/core'
import { rolldown } from 'rolldown'
import { dev, viteResolvePlugin } from 'rolldown/experimental'
import { describe, expect, it } from 'vitest'
import {
  assetPlugin,
  getHermesSWCIncludes,
  getHmrRuntimeSource,
  getNativeTransformConfig,
  getNativeViteResolveConfig,
  hermesCompatSWCPlugin,
  hmrClientNoopPlugin,
  vxrnCompilerPlugin,
  wrapNativeBundleModuleScope,
} from './createNativeDevEngine'

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

        expect(runtime.applyHmrUpdate(patch.code, patch.changedIds, patch.seq)).toBe(true)
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
})

// use a root with no .env files so only the platform defines are present
const root = '/tmp/vxrn-native-env-define-test-nonexistent'

describe('native Rolldown assets', () => {
  it('emits fetchable development metadata with a content hash per asset', async () => {
    const testRoot = await mkdtemp(join(tmpdir(), 'vxrn-native-assets-'))
    const assetRoot = join(testRoot, 'assets', 'fonts')
    const firstAsset = join(assetRoot, 'first.ttf')
    const secondAsset = join(assetRoot, 'second.ttf')
    await mkdir(assetRoot, { recursive: true })
    await writeFile(firstAsset, 'first-font')
    await writeFile(secondAsset, 'second-font')

    const plugin = assetPlugin({ root: testRoot, platform: 'ios' })

    const loadMetadata = async (id: string) => {
      if (!plugin.load || typeof plugin.load === 'function') {
        throw new Error('native asset plugin has no object load hook')
      }
      const result = await Reflect.apply(plugin.load.handler, {}, [id])
      if (
        !result ||
        typeof result === 'string' ||
        !('code' in result) ||
        typeof result.code !== 'string'
      ) {
        throw new Error('native asset plugin did not emit JavaScript')
      }

      const generatedModule: { exports: unknown } = { exports: {} }
      Function('require', 'module', result.code)(
        (source: string) => {
          expect(source).toBe('react-native/Libraries/Image/AssetRegistry')
          return { registerAsset: (asset: unknown) => asset }
        },
        generatedModule
      )
      return generatedModule.exports
    }

    try {
      const first = await loadMetadata(firstAsset)
      const second = await loadMetadata(secondAsset)

      expect(first).toMatchObject({
        httpServerLocation: expect.stringMatching(
          /^\/__vxrn_dev_native_assets\/[a-f0-9]+$/
        ),
        hash: createHash('md5').update('first-font').digest('hex'),
      })
      expect(second).toMatchObject({
        httpServerLocation: expect.stringMatching(
          /^\/__vxrn_dev_native_assets\/[a-f0-9]+$/
        ),
        hash: createHash('md5').update('second-font').digest('hex'),
      })
      expect(first).not.toEqual(second)
    } finally {
      await rm(testRoot, { recursive: true, force: true })
    }
  })
})

describe('native Rolldown package conditions', () => {
  it('selects import and require exports according to the importing syntax', async () => {
    const testRoot = await mkdtemp(join(tmpdir(), 'vxrn-native-conditions-'))
    const packageRoot = join(testRoot, 'node_modules', 'conditional-pkg')
    await mkdir(packageRoot, { recursive: true })
    await writeFile(
      join(packageRoot, 'package.json'),
      JSON.stringify({
        name: 'conditional-pkg',
        exports: {
          '.': {
            import: './import.js',
            require: './require.cjs',
            default: './default.cjs',
          },
        },
      })
    )
    await writeFile(join(packageRoot, 'import.js'), "export const mode = 'import'\n")
    await writeFile(
      join(packageRoot, 'require.cjs'),
      "module.exports = { mode: 'require' }\n"
    )
    await writeFile(
      join(packageRoot, 'default.cjs'),
      "module.exports = { mode: 'default' }\n"
    )
    await writeFile(
      join(testRoot, 'required.cjs'),
      "module.exports = require('conditional-pkg')\n"
    )
    await writeFile(
      join(testRoot, 'entry.js'),
      "import { mode as imported } from 'conditional-pkg'\nimport required from './required.cjs'\nexport const modes = [imported, required.mode]\n"
    )

    const build = await rolldown({
      cwd: testRoot,
      input: join(testRoot, 'entry.js'),
      plugins: [viteResolvePlugin(getNativeViteResolveConfig(testRoot, 'ios', false))],
    })

    try {
      const output = await build.generate({ format: 'esm' })
      const chunk = output.output.find((item) => item.type === 'chunk')
      expect(chunk).toBeTruthy()
      if (!chunk) throw new Error('Rolldown did not emit a JavaScript chunk')

      const module = await import(
        `data:text/javascript;base64,${Buffer.from(chunk.code).toString('base64')}`
      )
      expect(module.modes).toEqual(['import', 'require'])
    } finally {
      await build.close()
      await rm(testRoot, { recursive: true, force: true })
    }
  })

  it('unwraps transpiled CommonJS defaults in type-module apps', async () => {
    const testRoot = await mkdtemp(join(tmpdir(), 'vxrn-native-cjs-interop-'))
    const packageRoot = join(testRoot, 'node_modules', 'transpiled-cjs')
    await mkdir(packageRoot, { recursive: true })
    await writeFile(
      join(testRoot, 'package.json'),
      JSON.stringify({ name: 'type-module-app', private: true, type: 'module' })
    )
    await writeFile(
      join(packageRoot, 'package.json'),
      JSON.stringify({ name: 'transpiled-cjs', main: './index.js' })
    )
    await writeFile(
      join(packageRoot, 'index.js'),
      "Object.defineProperty(exports, '__esModule', { value: true })\nexports.default = function Component() {}\n"
    )
    await writeFile(
      join(testRoot, 'entry.js'),
      "import Component from 'transpiled-cjs'\nexport const result = { type: typeof Component, keys: Object.keys(Component) }\n"
    )

    try {
      for (const dev of [true, false]) {
        const build = await rolldown({
          cwd: testRoot,
          input: join(testRoot, 'entry.js'),
          plugins: [viteResolvePlugin(getNativeViteResolveConfig(testRoot, 'ios', dev))],
        })

        try {
          const output = await build.generate({ format: 'esm' })
          const chunk = output.output.find((item) => item.type === 'chunk')
          expect(chunk).toBeTruthy()
          if (!chunk) throw new Error('Rolldown did not emit a JavaScript chunk')

          const module = await import(
            `data:text/javascript;base64,${Buffer.from(chunk.code).toString('base64')}`
          )
          expect(module.result).toEqual({ type: 'function', keys: [] })
        } finally {
          await build.close()
        }
      }
    } finally {
      await rm(testRoot, { recursive: true, force: true })
    }
  })
})

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

  it('adds transform-async-to-generator for production and dev async generators', () => {
    expect(getHermesSWCIncludes(true)).not.toContain('transform-async-to-generator')
    expect(getHermesSWCIncludes(true, true)).toContain('transform-async-to-generator')
    expect(getHermesSWCIncludes(false)).toContain('transform-async-to-generator')
  })

  it('adds transform-block-scoping for lexical loop bindings', () => {
    expect(getHermesSWCIncludes(true)).not.toContain('transform-block-scoping')
    expect(getHermesSWCIncludes(true, false, true)).toContain(
      'transform-block-scoping'
    )
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

  it('bundles executable async generators without unsupported Hermes syntax', async () => {
    const testRoot = await mkdtemp(join(tmpdir(), 'vxrn-hermes-async-generator-'))
    const entry = join(testRoot, 'entry.js')
    await writeFile(
      entry,
      `
export async function* values() {
  yield await Promise.resolve('first')
  yield 'second'
}

export async function collect() {
  const result = []
  for await (const value of values()) result.push(value)
  return result.join(':')
}
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

      const syntax = await parse(chunk.code, { syntax: 'ecmascript' })
      const pending: unknown[] = [syntax]
      const unsupported: object[] = []
      while (pending.length) {
        const value = pending.pop()
        if (Array.isArray(value)) {
          pending.push(...value)
          continue
        }
        if (typeof value !== 'object' || value === null) continue
        if ('async' in value && 'generator' in value && value.async && value.generator) {
          unsupported.push(value)
        }
        pending.push(...Object.values(value))
      }
      expect(unsupported).toEqual([])

      const module = await import(
        `data:text/javascript;base64,${Buffer.from(chunk.code).toString('base64')}`
      )
      expect(await module.collect()).toBe('first:second')
    } finally {
      await build.close()
      await rm(testRoot, { recursive: true, force: true })
    }
  })

  it('lowers per-iteration lexical bindings used by lazy method getters', async () => {
    const testRoot = await mkdtemp(join(tmpdir(), 'vxrn-hermes-loop-bindings-'))
    const entry = join(testRoot, 'entry.js')
    await writeFile(
      entry,
      `
class Schema {}

const methods = {
  nullish() {
    return 'nullish'
  },
  apply(fn) {
    return fn(this)
  },
}

for (const key in methods) {
  const fn = methods[key]
  Object.defineProperty(Schema.prototype, key, {
    get() {
      const bound = fn.bind(this)
      Object.defineProperty(this, key, { value: bound })
      return bound
    },
  })
}

export const result = new Schema().nullish()
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

      const syntax = await parse(chunk.code, { syntax: 'ecmascript' })
      const pending: unknown[] = [syntax]
      const unsupported: object[] = []
      while (pending.length) {
        const value = pending.pop()
        if (Array.isArray(value)) {
          pending.push(...value)
          continue
        }
        if (typeof value !== 'object' || value === null) continue
        if (
          'type' in value &&
          value.type === 'ForInStatement' &&
          'left' in value &&
          typeof value.left === 'object' &&
          value.left !== null &&
          'type' in value.left &&
          value.left.type === 'VariableDeclaration' &&
          'kind' in value.left &&
          value.left.kind !== 'var'
        ) {
          unsupported.push(value)
        }
        pending.push(...Object.values(value))
      }
      expect(unsupported).toEqual([])

      const module = await import(
        `data:text/javascript;base64,${Buffer.from(chunk.code).toString('base64')}`
      )
      expect(module.result).toBe('nullish')
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
    } finally {
      process.env.NODE_ENV = previousNodeEnv
    }
  })
})
