import { describe, expect, test } from 'vitest'
import { validateNativeApp } from './appManifest'

describe('native.app manifest', () => {
  test('accepts a valid manifest', () => {
    expect(() =>
      validateNativeApp({
        name: 'MyApp',
        displayName: 'My App',
        scheme: 'myapp',
        version: '1.0.0',
        ios: { bundleId: 'dev.one.myapp' },
        android: { applicationId: 'dev.one.myapp' },
      })
    ).not.toThrow()
  })

  test('rejects missing platform ids and invalid target names', () => {
    expect(() => validateNativeApp({} as any)).toThrow()
    expect(() => validateNativeApp({ name: 'my-app' } as any)).toThrow()
    expect(() =>
      validateNativeApp({ name: 'MyApp', ios: { bundleId: 'not-an-id' } } as any)
    ).toThrow()
    expect(() =>
      validateNativeApp({ name: 'MyApp', android: { applicationId: '' } } as any)
    ).toThrow()
    expect(() =>
      validateNativeApp({
        name: 'MyApp',
        icon: { source: '', backgroundColor: '#000000' },
        ios: { bundleId: 'dev.one.myapp' },
        android: { applicationId: 'dev.one.myapp' },
      })
    ).toThrow(/icon/)
    expect(() =>
      validateNativeApp({
        name: 'MyApp',
        splash: { source: './splash.png', backgroundColor: 'black' },
        ios: { bundleId: 'dev.one.myapp' },
        android: { applicationId: 'dev.one.myapp' },
      })
    ).toThrow(/splash/)
  })
})
