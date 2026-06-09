import { describe, expect, it } from 'vitest'
import {
  getNativeTransformConfig,
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
        expect(define['import.meta.env.TAMAGUI_ENVIRONMENT']).toBe(JSON.stringify(platform))

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
