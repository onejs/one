import { describe, expect, test } from 'vitest'
import { validateNativeApp } from './appManifest'

// smoke for the one/native re-export; the full cases live beside the
// canonical definition in @vxrn/utils.
describe('native.app manifest re-export', () => {
  test('validates through the shared definition', () => {
    expect(() =>
      validateNativeApp({
        name: 'MyApp',
        imagePicker: { camera: 'Take profile photos.' },
        notifications: {},
        ios: { bundleId: 'dev.one.myapp' },
        android: { applicationId: 'dev.one.myapp' },
      })
    ).not.toThrow()
    expect(() => validateNativeApp({} as any)).toThrow(/name/)
    expect(() =>
      validateNativeApp({
        name: 'MyApp',
        imagePicker: { camera: '' },
        ios: { bundleId: 'dev.one.myapp' },
        android: { applicationId: 'dev.one.myapp' },
      })
    ).toThrow(/imagePicker\.camera/)
    expect(() =>
      validateNativeApp({
        name: 'MyApp',
        notifications: { push: 'yes' },
        ios: { bundleId: 'dev.one.myapp' },
        android: { applicationId: 'dev.one.myapp' },
      } as any)
    ).toThrow(/notifications\.push/)
  })
})
