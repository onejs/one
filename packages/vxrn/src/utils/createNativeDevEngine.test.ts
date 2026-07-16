import { describe, expect, it } from 'vitest'
import {
  getHermesSWCIncludes,
  getNativeTransformConfig,
  hmrClientNoopPlugin,
  vxrnCompilerPlugin,
  wrapNativeBundleModuleScope,
} from './createNativeDevEngine'

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
})

describe('wrapNativeBundleModuleScope', () => {
  // matches the marker rolldown dev() emits at the start of the runtime region
  const RUNTIME_MARKER = '//#region \\0rolldown/runtime.js'

  it('wraps module code after the prelude so top-level vars do not leak to global', () => {
    const prelude = 'globalThis.global = globalThis;\nglobalThis.__DEV__ = true;\n'
    // a top-level `var Headers` in a script becomes a non-configurable global,
    // which is the exact leak that breaks RN's polyfillGlobal in dev
    const body = `${RUNTIME_MARKER}\nvar fetch_hot, fetch$1, Headers, Request, Response$1;\nglobalThis.__rolldown_runtime__ = {};\n`
    const sourcemap = '\n//# sourceMappingURL=x.js.map'

    const out = wrapNativeBundleModuleScope(prelude + body + sourcemap)

    const openIdx = out.indexOf(';(function() {')
    expect(openIdx).toBeGreaterThan(-1)
    // prelude (global setup) stays at script scope, before the wrap opens
    expect(out.indexOf('globalThis.__DEV__')).toBeLessThan(openIdx)
    // the leaking declaration is now inside the function scope
    expect(out.indexOf('var fetch_hot')).toBeGreaterThan(openIdx)
    // the wrap closes before the sourceMappingURL, which must remain the last line
    expect(out.indexOf('})();')).toBeLessThan(out.indexOf('//# sourceMappingURL'))
    expect(out.trimEnd().endsWith('//# sourceMappingURL=x.js.map')).toBe(true)
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

  it('adds transform-async-to-generator only in production', () => {
    expect(getHermesSWCIncludes(true)).not.toContain('transform-async-to-generator')
    expect(getHermesSWCIncludes(false)).toContain('transform-async-to-generator')
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
