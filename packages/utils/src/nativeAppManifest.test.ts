import { describe, expect, test } from 'vitest'
import { validateNativeApp, type NativeAppManifest } from './nativeAppManifest'

const app = {
  name: 'MyApp',
  displayName: 'My App',
  scheme: ['myapp', 'myapp-dev'],
  version: '1.0.0',
  imagePicker: { camera: 'Take profile photos.' },
  ios: {
    bundleId: 'dev.one.myapp',
    buildNumber: '42',
    tablet: true,
    deploymentTarget: '17.0',
    screensGamma: true,
    useFrameworks: 'static',
    ccache: true,
    usesNonExemptEncryption: false,
  },
  android: { applicationId: 'dev.one.myapp', versionCode: 42, minSdk: 28 },
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
    expect(() => validateNativeApp({ ...app, scheme: 'not a scheme' })).toThrow(/scheme/)
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
    expect(() => validateNativeApp({ ...app, imagePicker: { camera: '' } })).toThrow(
      /imagePicker\.camera/
    )
    expect(() => validateNativeApp({ ...app, imagePicker: { camera: '   ' } })).toThrow(
      /imagePicker\.camera/
    )
  })

  test('validates the iOS widget target and App Group before prebuild', () => {
    const widgets = {
      appGroup: 'group.dev.one.myapp',
      kind: 'MyAppStatus',
      displayName: 'Status',
      description: 'Current status',
    }
    expect(() =>
      validateNativeApp({ ...app, ios: { ...app.ios, widgets } })
    ).not.toThrow()
    expect(() =>
      validateNativeApp({
        ...app,
        ios: { ...app.ios, widgets: { ...widgets, pushNotifications: 'yes' as any } },
      })
    ).toThrow(/pushNotifications/)
    expect(() =>
      validateNativeApp({
        ...app,
        ios: { ...app.ios, deploymentTarget: '16.4', widgets },
      })
    ).toThrow(/deploymentTarget/)
    expect(() =>
      validateNativeApp({
        ...app,
        ios: { ...app.ios, widgets: { ...widgets, appGroup: 'dev.one.myapp' } },
      })
    ).toThrow(/appGroup/)
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
    expect(() => validateNativeApp({ name: 'MyApp', ios: app.ios } as any)).toThrow(
      /applicationId/
    )
    expect(() =>
      validateNativeApp({
        name: 'MyApp',
        ios: app.ios,
        android: { applicationId: '' },
      } as any)
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
    expect(() =>
      validateNativeApp({
        ...app,
        ios: { bundleId: 'dev.one.myapp', buildNumber: '1 2' },
      })
    ).toThrow(/buildNumber/)
    expect(() =>
      validateNativeApp({
        ...app,
        ios: { bundleId: 'dev.one.myapp', buildNumber: '' },
      })
    ).toThrow(/buildNumber/)
    expect(() =>
      validateNativeApp({
        ...app,
        android: { applicationId: 'dev.one.myapp', versionCode: 0 },
      })
    ).toThrow(/versionCode/)
    expect(() =>
      validateNativeApp({
        ...app,
        android: { applicationId: 'dev.one.myapp', versionCode: 1.5 },
      })
    ).toThrow(/versionCode/)
  })

  test('accepts notifications and rejects a non-boolean push', () => {
    expect(() => validateNativeApp({ ...app, notifications: undefined })).not.toThrow()
    expect(() =>
      validateNativeApp({ ...app, notifications: { push: true } })
    ).not.toThrow()
    expect(() =>
      validateNativeApp({ ...app, notifications: { push: 'yes' } } as any)
    ).toThrow(/notifications\.push/)
    expect(() => validateNativeApp({ ...app, notifications: true } as any)).toThrow(
      /notifications\.push/
    )
  })

  test('accepts a maps key and rejects empty ones', () => {
    expect(() =>
      validateNativeApp({
        ...app,
        android: { ...app.android, googleMapsApiKey: 'AIza-test' },
      })
    ).not.toThrow()
    expect(() =>
      validateNativeApp({
        ...app,
        android: { ...app.android, googleMapsApiKey: '' },
      })
    ).toThrow(/googleMapsApiKey/)
    expect(() =>
      validateNativeApp({
        ...app,
        android: { ...app.android, googleMapsApiKey: '   ' },
      })
    ).toThrow(/googleMapsApiKey/)
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
