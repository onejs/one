import { describe, expect, it } from 'vitest'
import { getNativeTransformConfig } from './createNativeDevEngine'

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
