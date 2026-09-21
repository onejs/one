import { describe, expect, test } from 'vitest'
import { validateNativeApp, type NativeAppManifest } from './nativeAppManifest'

const app = {
  name: 'MyApp',
  displayName: 'My App',
  scheme: ['myapp', 'myapp-dev'],
  version: '1.0.0',
  imagePicker: { camera: 'Take profile photos.' },
  notifications: {},
  ios: {
    bundleId: 'dev.one.myapp',
    tablet: true,
    deploymentTarget: '17.0',
    screensGamma: true,
    useFrameworks: 'static',
    ccache: true,
    usesNonExemptEncryption: false,
  },
  android: { applicationId: 'dev.one.myapp', minSdk: 28 },
} satisfies NativeAppManifest

describe('native.app manifest', () => {
  test('accepts a valid manifest', () => {
    expect(() => validateNativeApp(app)).not.toThrow()
    expect(() => validateNativeApp(app, 'ios')).not.toThrow()
    expect(() => validateNativeApp(app, 'android')).not.toThrow()
    expect(validateNativeApp(app)).toBe(app)
  })

  test('rejects invalid target names and schemes', () => {
    expect(() => validateNativeApp({} as any)).toThrow(/name/)
    expect(() => validateNativeApp({ name: 'my-app' } as any)).toThrow(/name/)
    expect(() => validateNativeApp({ ...app, scheme: 'not a scheme' })).toThrow(
      /scheme/
    )
  })

  test('rejects bad versions, icons, and splashes', () => {
    expect(() => validateNativeApp({ ...app, version: 'latest' })).toThrow(/version/)
    expect(() =>
      validateNativeApp({
        ...app,
        icon: { source: '', backgroundColor: '#000000' },
      })
    ).toThrow(/icon/)
    expect(() =>
      validateNativeApp({
        ...app,
        splash: { source: './splash.png', backgroundColor: 'black' },
      })
    ).toThrow(/splash/)
    expect(() =>
      validateNativeApp({
        ...app,
        splash: { source: './splash.png', backgroundColor: '#000000', width: 0.99 },
      })
    ).toThrow(/splash/)
    expect(() =>
      validateNativeApp({
        ...app,
        splash: { source: './splash.png', backgroundColor: '#000000', width: 289 },
      })
    ).toThrow(/splash/)
  })

  test('accepts a camera permission string and rejects empty ones', () => {
    expect(() => validateNativeApp({ ...app, imagePicker: undefined })).not.toThrow()
    expect(() =>
      validateNativeApp({ ...app, imagePicker: { camera: '' } })
    ).toThrow(/imagePicker\.camera/)
    expect(() =>
      validateNativeApp({ ...app, imagePicker: { camera: '   ' } })
    ).toThrow(/imagePicker\.camera/)
  })

  test('accepts notifications and rejects a non-boolean push', () => {
    expect(() => validateNativeApp({ ...app, notifications: undefined })).not.toThrow()
    expect(() =>
      validateNativeApp({ ...app, notifications: { push: true } })
    ).not.toThrow()
    expect(() =>
      validateNativeApp({ ...app, notifications: { push: 'yes' } } as any)
    ).toThrow(/notifications\.push/)
    expect(() =>
      validateNativeApp({ ...app, notifications: true } as any)
    ).toThrow(/notifications\.push/)
  })

  test('rejects missing platform ids and out-of-range platform values', () => {
    expect(() => validateNativeApp({ name: 'MyApp' } as any)).toThrow(/bundleId/)
    expect(() =>
      validateNativeApp({ name: 'MyApp', android: app.android } as any)
    ).toThrow(/bundleId/)
    expect(() =>
      validateNativeApp({
        name: 'MyApp',
        ios: { bundleId: 'not-an-id' },
        android: app.android,
      } as any)
    ).toThrow(/bundleId/)
    expect(() =>
      validateNativeApp({ name: 'MyApp', ios: app.ios } as any)
    ).toThrow(/applicationId/)
    expect(() =>
      validateNativeApp({
        ...app,
        ios: { bundleId: 'dev.one.myapp', deploymentTarget: 'latest' },
      } as any)
    ).toThrow(/deploymentTarget/)
    expect(() =>
      validateNativeApp({ ...app, android: { ...app.android, minSdk: 20 } } as any)
    ).toThrow(/minSdk/)
  })

  test('platform scope skips the other platform requirement', () => {
    expect(() =>
      validateNativeApp({ name: 'MyApp', android: app.android } as any, 'android')
    ).not.toThrow()
    expect(() =>
      validateNativeApp({ name: 'MyApp', ios: app.ios } as any, 'ios')
    ).not.toThrow()
  })
})
