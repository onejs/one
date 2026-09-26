import { execFileSync } from 'node:child_process'
import {
  mkdtempSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { swiftPackageDirectories } from '../utils/swiftPackageId'
import {
  applyAndroidDependencyPatches,
  generateForPlatform,
  getNativeDependencyInventory,
  renderPrebuildFile,
  renderSceneDelegateSwift,
  type PrebuildAppConfig,
  validatePrebuildApp,
} from './prebuildWithoutExpo'

const app = {
  name: 'MyApp',
  displayName: 'My App',
  scheme: ['myapp', 'myapp-dev'],
  notifications: {},
  imagePicker: { camera: 'Capture photos & videos' },
  speech: { recognition: 'Dictate notes', microphone: 'Record dictation' },
  ios: {
    bundleId: 'dev.one.myapp',
    tablet: true,
    deploymentTarget: '17.0',
    screensGamma: true,
    useFrameworks: 'static',
    ccache: true,
    usesNonExemptEncryption: false,
    fileSharing: true,
  },
  android: { applicationId: 'dev.one.myapp', minSdk: 28 },
} satisfies PrebuildAppConfig

describe('native.app prebuild validation', () => {
  // smoke for the shared definition re-export; the full cases live beside
  // the canonical definition in @vxrn/utils.
  it('accepts a valid manifest and rejects invalid ones before writing', () => {
    expect(() => validatePrebuildApp(app)).not.toThrow()
    expect(() => validatePrebuildApp(app, 'ios')).not.toThrow()
    expect(() => validatePrebuildApp(app, 'android')).not.toThrow()
    expect(() => validatePrebuildApp({} as any)).toThrow(/name/)
    expect(() => validatePrebuildApp({ name: 'MyApp' } as any)).toThrow(/bundleId/)
    expect(() =>
      validatePrebuildApp({ name: 'MyApp', android: app.android } as any)
    ).toThrow(/bundleId/)
    expect(() =>
      validatePrebuildApp({
        name: 'MyApp',
        ios: { bundleId: 'not-an-id' },
        android: app.android,
      } as any)
    ).toThrow(/bundleId/)
    expect(() =>
      validatePrebuildApp({
        ...app,
        ios: { bundleId: 'dev.one.myapp', deploymentTarget: 'latest' },
      } as any)
    ).toThrow(/deploymentTarget/)
    expect(() => validatePrebuildApp({ ...app, version: '1.0' })).toThrow(/version/)
    expect(() =>
      validatePrebuildApp({
        ...app,
        ios: { ...app.ios, buildNumber: '1 2' },
      } as any)
    ).toThrow(/buildNumber/)
    expect(() =>
      validatePrebuildApp({ ...app, android: { ...app.android, versionCode: 0 } } as any)
    ).toThrow(/versionCode/)
    expect(() =>
      validatePrebuildApp({
        ...app,
        android: { ...app.android, versionCode: 1.5 },
      } as any)
    ).toThrow(/versionCode/)
    expect(() =>
      validatePrebuildApp({ ...app, android: { ...app.android, minSdk: 20 } } as any)
    ).toThrow(/minSdk/)
    expect(() =>
      validatePrebuildApp({
        ...app,
        icon: { source: '', backgroundColor: '#000000' },
      })
    ).toThrow(/icon/)
    expect(() =>
      validatePrebuildApp({
        ...app,
        splash: { source: './splash.png', backgroundColor: 'black' },
      })
    ).toThrow(/splash/)
    expect(() =>
      validatePrebuildApp({
        ...app,
        splash: { source: './splash.png', backgroundColor: '#000000', width: 0.99 },
      })
    ).toThrow(/splash/)
    expect(() =>
      validatePrebuildApp({
        ...app,
        splash: { source: './splash.png', backgroundColor: '#000000', width: 289 },
      })
    ).toThrow(/splash/)
    expect(() => validatePrebuildApp({ ...app, imagePicker: { camera: '' } })).toThrow(
      /imagePicker\.camera/
    )
    expect(() =>
      validatePrebuildApp({ ...app, notifications: { push: 'yes' } } as any)
    ).toThrow(/notifications\.push/)
    // platform-scoped: android-only skips the ios requirement and vice versa
    expect(() =>
      validatePrebuildApp({ name: 'MyApp', android: app.android } as any, 'android')
    ).not.toThrow()
    expect(() =>
      validatePrebuildApp({ name: 'MyApp', ios: app.ios } as any, 'ios')
    ).not.toThrow()
  })
})

// the template's AppDelegate entries, which the scene delegate patch anchors on
const APP_DELEGATE_PBXPROJ = `\t\t761780ED2CA45674006654EE /* AppDelegate.swift in Sources */ = {isa = PBXBuildFile; fileRef = 761780EC2CA45674006654EE /* AppDelegate.swift */; };
\t\t761780EC2CA45674006654EE /* AppDelegate.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; name = AppDelegate.swift; path = HelloWorld/AppDelegate.swift; sourceTree = "<group>"; };
\t\t\t\t761780EC2CA45674006654EE /* AppDelegate.swift */,
\t\t\t\t761780ED2CA45674006654EE /* AppDelegate.swift in Sources */,`

describe('template rendering', () => {
  it('applies names, ids, and platform versions', () => {
    const ios = renderPrebuildFile({
      relativePath: 'HelloWorld.xcodeproj/project.pbxproj',
      content: `PRODUCT_BUNDLE_IDENTIFIER = "org.reactjs.native.example.$(PRODUCT_NAME:rfc1034identifier)"; IPHONEOS_DEPLOYMENT_TARGET = 15.1; TARGETED_DEVICE_FAMILY = "1,2"; target HelloWorld
shellScript = ${JSON.stringify('REACT_NATIVE_XCODE="$REACT_NATIVE_PATH/scripts/react-native-xcode.sh"\n/bin/sh -c "\\"$WITH_ENVIRONMENT\\" \\"$REACT_NATIVE_XCODE\\""\n')};
${APP_DELEGATE_PBXPROJ}`,
      platform: 'ios',
      app,
    })
    expect(ios.destRelativePath).toBe('MyApp.xcodeproj/project.pbxproj')
    expect(ios.content).toContain('PRODUCT_BUNDLE_IDENTIFIER = "dev.one.myapp"')
    expect(ios.content).toContain('IPHONEOS_DEPLOYMENT_TARGET = 17.0;')
    expect(ios.content).toContain('TARGETED_DEVICE_FAMILY = "1,2";')
    expect(ios.content).not.toContain('HelloWorld')
    expect(ios.content).toContain(
      '/* SceneDelegate.swift in Sources */ = {isa = PBXBuildFile;'
    )
    expect(ios.content).toContain('path = MyApp/SceneDelegate.swift')
    expect(ios.content).toContain('/* SceneDelegate.swift */,')
    expect(ios.content).toContain('/* SceneDelegate.swift in Sources */,')

    const podfile = renderPrebuildFile({
      relativePath: 'Podfile',
      content:
        "platform :ios, min_ios_version_supported\ntarget 'HelloWorld' do\n  config = use_native_modules!\n  post_install do |installer|\n    react_native_post_install(\n      installer\n    )\n  end\nend",
      platform: 'ios',
      app,
      nitroWebImage: true,
    })
    expect(podfile.content).toContain("platform :ios, '17.0'")
    expect(podfile.content).toContain(
      "  config = use_native_modules!\n  # [vxrn/one] nitro web image modular header\n  pod 'SDWebImage', :modular_headers => true\n  # [vxrn/one] swift packages\n  Dir[File.join(__dir__, 'OneSwiftPackages'"
    )
    expect(podfile.content).toContain(
      "config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '17.0'"
    )
    expect(podfile.content).toContain("ENV['RNS_GAMMA_ENABLED'] ||= '1'")
    expect(podfile.content).toContain("ENV['USE_CCACHE'] ||= '1'")
    expect(podfile.content).toContain('use_frameworks! :linkage => :static')
    expect(podfile.content).toContain("pod 'SDWebImage', :modular_headers => true")

    const infoPlist = renderPrebuildFile({
      relativePath: 'HelloWorld/Info.plist',
      content: '<dict>\n\t<key>LSRequiresIPhoneOS</key>\n</dict>',
      platform: 'ios',
      app,
    })
    expect(infoPlist.content).toContain('<key>CFBundleURLSchemes</key>')
    expect(infoPlist.content).toContain('<string>myapp</string>')
    expect(infoPlist.content).toContain('<string>myapp-dev</string>')
    expect(infoPlist.content).toContain('<key>ITSAppUsesNonExemptEncryption</key>')
    expect(infoPlist.content).toContain('<false/>')
    expect(infoPlist.content).toContain('<key>UIFileSharingEnabled</key>')
    expect(infoPlist.content).toContain('<key>LSSupportsOpeningDocumentsInPlace</key>')
    expect(infoPlist.content).toContain('<key>OneNativeNotificationsEnabled</key>')
    expect(infoPlist.content).not.toContain('OneNativeNotificationsPush')
    expect(() =>
      renderPrebuildFile({
        relativePath: 'HelloWorld/Info.plist',
        content: '<dict>\n</dict>',
        platform: 'ios',
        app,
      })
    ).toThrow('lost its LSRequiresIPhoneOS anchor')
    expect(infoPlist.content).toContain('<key>NSCameraUsageDescription</key>')
    expect(infoPlist.content).toContain('<string>Capture photos &amp; videos</string>')
    expect(infoPlist.content).toContain('<key>NSSpeechRecognitionUsageDescription</key>')
    expect(infoPlist.content).toContain('<key>NSMicrophoneUsageDescription</key>')

    const androidManifest = renderPrebuildFile({
      relativePath: 'app/src/main/AndroidManifest.xml',
      content:
        '<manifest>\n    <uses-permission android:name="android.permission.INTERNET" />\n    <activity>\n      </activity>\n    </application>',
      platform: 'android',
      app,
    })
    expect(androidManifest.content).toContain(
      '<uses-permission android:name="android.permission.CAMERA" />'
    )
    expect(androidManifest.content).toContain(
      '<uses-permission android:name="android.permission.RECORD_AUDIO" />'
    )
    expect(androidManifest.content).toContain(
      '<action android:name="android.speech.RecognitionService" />'
    )
    expect(androidManifest.content).toContain(
      '<action android:name="android.intent.action.VIEW" />'
    )
    expect(androidManifest.content).toContain('<data android:scheme="myapp" />')
    expect(androidManifest.content).toContain('<data android:scheme="myapp-dev" />')
    expect(androidManifest.content).toContain(
      '<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />'
    )
    expect(androidManifest.content).toContain(
      '<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />'
    )
    expect(androidManifest.content).toContain('OneNativeNotificationsReceiver')
    expect(androidManifest.content).toContain('android.intent.action.BOOT_COMPLETED')

    const android = renderPrebuildFile({
      relativePath: 'app/src/main/java/com/helloworld/MainActivity.kt',
      content:
        'package com.helloworld\n\nimport com.facebook.react.ReactActivity\n\nclass MainActivity : ReactActivity() {\n}\n\nminSdkVersion = 24\n// Hello App Display Name',
      platform: 'android',
      app,
    })
    expect(android.destRelativePath).toBe(
      'app/src/main/java/dev/one/myapp/MainActivity.kt'
    )
    expect(android.content).toContain('package dev.one.myapp')
    expect(android.content).toContain('minSdkVersion = 28')
    expect(android.content).toContain('My App')

    const androidSettings = renderPrebuildFile({
      relativePath: 'settings.gradle',
      content: `pluginManagement { includeBuild("../node_modules/@react-native/gradle-plugin") }
includeBuild('../node_modules/@react-native/gradle-plugin')`,
      platform: 'android',
      app,
    })
    expect(androidSettings.content).toContain(
      ".resolve('@react-native/gradle-plugin/package.json')"
    )
    expect(androidSettings.content).toContain(
      "createRequire(require.resolve('react-native/package.json'))"
    )
    expect(androidSettings.content).not.toContain('../node_modules')
  })

  it('stamps marketing and build versions from the manifest', () => {
    const stamped = {
      ...app,
      version: '9.9.9',
      ios: { ...app.ios, buildNumber: '4242' },
      android: { ...app.android, versionCode: 4242 },
    } satisfies PrebuildAppConfig
    const ios = renderPrebuildFile({
      relativePath: 'HelloWorld.xcodeproj/project.pbxproj',
      content: `\t\t\t\tCURRENT_PROJECT_VERSION = 1;\n\t\t\t\tMARKETING_VERSION = 1.0;\n\t\t\t\tCURRENT_PROJECT_VERSION = 1;\n\t\t\t\tMARKETING_VERSION = 1.0;\nshellScript = ${JSON.stringify('REACT_NATIVE_XCODE="$REACT_NATIVE_PATH/scripts/react-native-xcode.sh"\n/bin/sh -c "\\"$WITH_ENVIRONMENT\\" \\"$REACT_NATIVE_XCODE\\""\n')};\n${APP_DELEGATE_PBXPROJ}`,
      platform: 'ios',
      app: stamped,
    })
    expect(ios.content).toContain('MARKETING_VERSION = "9.9.9";')
    expect(ios.content).toContain('CURRENT_PROJECT_VERSION = 4242;')
    expect(ios.content).not.toContain('MARKETING_VERSION = 1.0;')
    expect(ios.content).not.toContain('CURRENT_PROJECT_VERSION = 1;')

    const android = renderPrebuildFile({
      relativePath: 'app/build.gradle',
      content:
        'react {\n    autolinkLibrariesWithApp()\n}\nversionCode 1\nversionName "1.0"',
      platform: 'android',
      app: stamped,
    })
    expect(android.content).toContain('versionCode 4242')
    expect(android.content).toContain('versionName "9.9.9"')
    expect(android.content).not.toContain('versionCode 1')
    expect(android.content).not.toContain('versionName "1.0"')
  })

  it('keeps template defaults when version fields are absent', () => {
    // the shared app fixture sets no version fields: stamping is a no-op and
    // the template defaults survive, documenting the store-build requirement.
    const ios = renderPrebuildFile({
      relativePath: 'HelloWorld.xcodeproj/project.pbxproj',
      content: `\t\t\t\tCURRENT_PROJECT_VERSION = 1;\n\t\t\t\tMARKETING_VERSION = 1.0;\nshellScript = ${JSON.stringify('REACT_NATIVE_XCODE="$REACT_NATIVE_PATH/scripts/react-native-xcode.sh"\n/bin/sh -c "\\"$WITH_ENVIRONMENT\\" \\"$REACT_NATIVE_XCODE\\""\n')};\n${APP_DELEGATE_PBXPROJ}`,
      platform: 'ios',
      app,
    })
    expect(ios.content).toContain('MARKETING_VERSION = 1.0;')
    expect(ios.content).toContain('CURRENT_PROJECT_VERSION = 1;')

    const android = renderPrebuildFile({
      relativePath: 'app/build.gradle',
      content:
        'react {\n    autolinkLibrariesWithApp()\n}\nversionCode 1\nversionName "1.0"',
      platform: 'android',
      app,
    })
    expect(android.content).toContain('versionCode 1')
    expect(android.content).toContain('versionName "1.0"')
  })

  it('omits camera entries when imagePicker.camera is unset', () => {
    const bare = { ...app, imagePicker: undefined, speech: undefined, notifications: undefined }
    const infoPlist = renderPrebuildFile({
      relativePath: 'HelloWorld/Info.plist',
      content: '<dict>\n\t<key>LSRequiresIPhoneOS</key>\n</dict>',
      platform: 'ios',
      app: bare,
    })
    expect(infoPlist.content).not.toContain('NSCameraUsageDescription')
    expect(infoPlist.content).not.toContain('NSMicrophoneUsageDescription')
    const androidManifest = renderPrebuildFile({
      relativePath: 'app/src/main/AndroidManifest.xml',
      content:
        '<manifest>\n    <uses-permission android:name="android.permission.INTERNET" />',
      platform: 'android',
      app: bare,
    })
    expect(androidManifest.content).not.toContain('android.permission.CAMERA')
    expect(androidManifest.content).not.toContain('android.permission.RECORD_AUDIO')
  })

  it('stamps the maps key and flag only when googleMapsApiKey is set', () => {
    const maps = {
      ...app,
      android: { ...app.android, googleMapsApiKey: 'AIza-test&key' },
    } satisfies PrebuildAppConfig
    const manifest = renderPrebuildFile({
      relativePath: 'app/src/main/AndroidManifest.xml',
      content:
        '<manifest>\n    <uses-permission android:name="android.permission.INTERNET" />\n    <activity>\n      </activity>\n    </application>',
      platform: 'android',
      app: maps,
    })
    expect(manifest.content).toContain('com.google.android.geo.API_KEY')
    expect(manifest.content).toContain('android:value="AIza-test&amp;key"')
    const props = renderPrebuildFile({
      relativePath: 'gradle.properties',
      content: 'hermesEnabled=true',
      platform: 'android',
      app: maps,
    })
    expect(props.content).toContain('oneNativeMaps=true')

    const bare = renderPrebuildFile({
      relativePath: 'app/src/main/AndroidManifest.xml',
      content:
        '<manifest>\n    <uses-permission android:name="android.permission.INTERNET" />\n    <activity>\n      </activity>\n    </application>',
      platform: 'android',
      app,
    })
    expect(bare.content).not.toContain('com.google.android.geo.API_KEY')
    const bareProps = renderPrebuildFile({
      relativePath: 'gradle.properties',
      content: 'hermesEnabled=true',
      platform: 'android',
      app,
    })
    expect(bareProps.content).not.toContain('oneNativeMaps=true')

    // maps-only manifest: the shared fixture also sets imagePicker.camera,
    // whose stamper would report the missing anchor first.
    const mapsOnly = {
      name: 'MyApp',
      android: { applicationId: 'dev.one.myapp', googleMapsApiKey: 'AIza-test' },
    } satisfies PrebuildAppConfig
    expect(() =>
      renderPrebuildFile({
        relativePath: 'app/src/main/AndroidManifest.xml',
        content: '<manifest>\n</manifest>',
        platform: 'android',
        app: mapsOnly,
      })
    ).toThrow(
      '[vxrn] cannot stamp the maps api key: expected </application> in app/src/main/AndroidManifest.xml'
    )
  })

  it('omits notification entries when notifications is unset', () => {
    const bare = { ...app, notifications: undefined }
    const infoPlist = renderPrebuildFile({
      relativePath: 'HelloWorld/Info.plist',
      content: '<dict>\n\t<key>LSRequiresIPhoneOS</key>\n</dict>',
      platform: 'ios',
      app: bare,
    })
    expect(infoPlist.content).not.toContain('OneNativeNotificationsEnabled')
    const androidManifest = renderPrebuildFile({
      relativePath: 'app/src/main/AndroidManifest.xml',
      content:
        '<manifest>\n    <uses-permission android:name="android.permission.INTERNET" />\n    <activity>\n      </activity>\n    </application>',
      platform: 'android',
      app: bare,
    })
    expect(androidManifest.content).not.toContain('POST_NOTIFICATIONS')
    expect(androidManifest.content).not.toContain('OneNativeNotificationsReceiver')
  })

  it('fails loudly when a notification anchor is missing', () => {
    const noCamera = { ...app, imagePicker: undefined, speech: undefined }
    expect(() =>
      renderPrebuildFile({
        relativePath: 'app/src/main/AndroidManifest.xml',
        content: '<manifest>\n    <activity>\n      </activity>\n    </application>',
        platform: 'android',
        app: noCamera,
      })
    ).toThrow(/cannot stamp notification permissions/)
    expect(() =>
      renderPrebuildFile({
        relativePath: 'app/src/main/AndroidManifest.xml',
        content:
          '<manifest>\n    <uses-permission android:name="android.permission.INTERNET" />\n    <activity>',
        platform: 'android',
        app: noCamera,
      })
    ).toThrow(/failed to stamp the notification receiver/)
  })

  it('stamps push entries only when notifications.push is set', () => {
    const push = {
      ...app,
      notifications: { push: true },
    } satisfies PrebuildAppConfig
    const props = renderPrebuildFile({
      relativePath: 'gradle.properties',
      content: 'hermesEnabled=true',
      platform: 'android',
      app: push,
    })
    expect(props.content).toContain('oneNativePush=true')
    const manifest = renderPrebuildFile({
      relativePath: 'app/src/main/AndroidManifest.xml',
      content:
        '<manifest>\n    <uses-permission android:name="android.permission.INTERNET" />\n    <activity>\n      </activity>\n    </application>',
      platform: 'android',
      app: push,
    })
    expect(manifest.content).toContain('OneNativeNotificationsReceiver')
    expect(manifest.content).toContain('OneNativePushService')
    expect(manifest.content).toContain('com.google.firebase.MESSAGING_EVENT')

    const pbxproj = renderPrebuildFile({
      relativePath: 'HelloWorld.xcodeproj/project.pbxproj',
      content: `shellScript = ${JSON.stringify('REACT_NATIVE_XCODE="$REACT_NATIVE_PATH/scripts/react-native-xcode.sh"\n/bin/sh -c "\\"$WITH_ENVIRONMENT\\" \\"$REACT_NATIVE_XCODE\\""\n')};\nproduct\n${APP_DELEGATE_PBXPROJ}\n\t\t\t\tPRODUCT_NAME = HelloWorld;`,
      platform: 'ios',
      app: push,
    })
    expect(pbxproj.content).toContain(
      'CODE_SIGN_ENTITLEMENTS = MyApp/MyApp.entitlements;'
    )
    expect(pbxproj.content).toContain('/* MyApp.entitlements */')

    const appDelegate = renderPrebuildFile({
      relativePath: 'HelloWorld/AppDelegate.swift',
      content: `@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "HelloWorld",
      in: window,
      launchOptions: launchOptions
    )

    return true
  }
}`,
      platform: 'ios',
      app: push,
    })
    // one hooks the delegate's push callbacks at launch; the template
    // carries no forward of its own.
    expect(appDelegate.content).not.toContain(
      'didRegisterForRemoteNotificationsWithDeviceToken'
    )

    const bareProps = renderPrebuildFile({
      relativePath: 'gradle.properties',
      content: 'hermesEnabled=true',
      platform: 'android',
      app,
    })
    expect(bareProps.content).not.toContain('oneNativePush=true')
    const bareManifest = renderPrebuildFile({
      relativePath: 'app/src/main/AndroidManifest.xml',
      content:
        '<manifest>\n    <uses-permission android:name="android.permission.INTERNET" />\n    <activity>\n      </activity>\n    </application>',
      platform: 'android',
      app,
    })
    expect(bareManifest.content).not.toContain('OneNativePushService')
    const barePbxproj = renderPrebuildFile({
      relativePath: 'HelloWorld.xcodeproj/project.pbxproj',
      content: `shellScript = ${JSON.stringify('REACT_NATIVE_XCODE="$REACT_NATIVE_PATH/scripts/react-native-xcode.sh"\n/bin/sh -c "\\"$WITH_ENVIRONMENT\\" \\"$REACT_NATIVE_XCODE\\""\n')};\nproduct\n${APP_DELEGATE_PBXPROJ}\n\t\t\t\tPRODUCT_NAME = HelloWorld;`,
      platform: 'ios',
      app,
    })
    expect(barePbxproj.content).not.toContain('CODE_SIGN_ENTITLEMENTS')
    // the push service needs the receiver anchor: without notifications the
    // receiver stamper never runs, so the push stamper reports it.
    const pushOnly = {
      name: 'MyApp',
      notifications: { push: true },
      android: { applicationId: 'dev.one.myapp' },
    } satisfies PrebuildAppConfig
    expect(() =>
      renderPrebuildFile({
        relativePath: 'app/src/main/AndroidManifest.xml',
        content: '<manifest>\n</manifest>',
        platform: 'android',
        app: pushOnly,
      })
    ).toThrow(/cannot stamp notification permissions/)
  })

  it('throws instead of silently skipping a missing camera anchor', () => {
    // camera-only manifest: with schemes set the shared schemes stamper
    // reports the missing anchor first, so the camera error needs the
    // camera stamper to be the one reaching for it.
    const cameraOnly = {
      name: 'MyApp',
      imagePicker: { camera: 'Capture photos' },
      ios: { bundleId: 'dev.one.myapp' },
    } satisfies PrebuildAppConfig
    expect(() =>
      renderPrebuildFile({
        relativePath: 'HelloWorld/Info.plist',
        content: '<dict>\n</dict>',
        platform: 'ios',
        app: cameraOnly,
      })
    ).toThrow(
      '[vxrn] cannot stamp NSCameraUsageDescription: expected LSRequiresIPhoneOS in Info.plist'
    )
    expect(() =>
      renderPrebuildFile({
        relativePath: 'app/src/main/AndroidManifest.xml',
        content: '<manifest>\n</manifest>',
        platform: 'android',
        app,
      })
    ).toThrow(
      '[vxrn] cannot stamp the camera or microphone permission: expected the INTERNET permission in app/src/main/AndroidManifest.xml'
    )
  })

  it('resolves the gradle plugin from the react-native package without hoisting', () => {
    const root = mkdtempSync(join(tmpdir(), 'vxrn-gradle-plugin-'))
    const settingsDir = join(root, 'android')
    mkdirSync(settingsDir, { recursive: true })
    // strict layout: the plugin lives under react-native, nothing hoisted
    const nested = join(
      root,
      'node_modules',
      'react-native',
      'node_modules',
      '@react-native',
      'gradle-plugin'
    )
    mkdirSync(nested, { recursive: true })
    writeFileSync(
      join(root, 'node_modules', 'react-native', 'package.json'),
      JSON.stringify({ name: 'react-native', version: '0.0.0' })
    )
    writeFileSync(
      join(nested, 'package.json'),
      JSON.stringify({ name: '@react-native/gradle-plugin', version: '0.0.0' })
    )

    const rendered = renderPrebuildFile({
      relativePath: 'settings.gradle',
      content: `pluginManagement { includeBuild("../node_modules/@react-native/gradle-plugin") }
includeBuild('../node_modules/@react-native/gradle-plugin')`,
      platform: 'android',
      app,
    })
    const script = (rendered.content ?? '').match(/"--print", "([^"]+)"\]/)?.[1]
    if (!script) throw new Error('expected generated node resolution script')
    // execute the generated node resolution the way gradle would, from the
    // settings directory so lookup walks up to the app root
    const resolved = execFileSync(process.execPath, ['--print', script], {
      cwd: settingsDir,
      encoding: 'utf8',
    }).trim()
    expect(resolved).toBe(realpathSync(join(nested, 'package.json')))

    // negative control: a bare top-level resolution fails here, proving the
    // fixture is genuinely non-hoisted and the old snippet would break
    expect(() =>
      execFileSync(
        process.execPath,
        ['--print', "require.resolve('@react-native/gradle-plugin/package.json')"],
        { cwd: settingsDir, stdio: 'pipe' }
      )
    ).toThrow()
  })

  it('resolves codegen and hermes from react-native without hoisting', () => {
    const root = mkdtempSync(join(tmpdir(), 'vxrn-react-native-dependencies-'))
    const androidDir = join(root, 'android')
    const reactNativeDir = join(root, 'node_modules', 'react-native')
    mkdirSync(androidDir, { recursive: true })
    mkdirSync(reactNativeDir, { recursive: true })
    writeFileSync(
      join(reactNativeDir, 'package.json'),
      JSON.stringify({ name: 'react-native', version: '0.0.0' })
    )

    for (const packageName of ['@react-native/codegen', 'hermes-compiler']) {
      const nested = join(reactNativeDir, 'node_modules', packageName)
      mkdirSync(nested, { recursive: true })
      writeFileSync(
        join(nested, 'package.json'),
        JSON.stringify({ name: packageName, version: '0.0.0' })
      )

      const generatedResolver = `require('module').createRequire(require.resolve('react-native/package.json')).resolve('${packageName}/package.json')`
      const resolved = execFileSync(process.execPath, ['--print', generatedResolver], {
        cwd: androidDir,
        encoding: 'utf8',
      }).trim()
      expect(resolved).toBe(realpathSync(join(nested, 'package.json')))

      // the former top-level lookup must fail or this fixture cannot prove the
      // strict dependency layout used by package managers without hoisting
      expect(() =>
        execFileSync(
          process.execPath,
          ['--print', `require.resolve('${packageName}/package.json')`],
          { cwd: androidDir, stdio: 'pipe' }
        )
      ).toThrow()
    }
  })

  it('passes binaries through untouched', () => {
    const rendered = renderPrebuildFile({
      relativePath: 'res/icon.png',
      content: null,
      platform: 'android',
      app,
    })
    expect(rendered.content).toBeNull()
  })

  it('renders byte-identically across runs', () => {
    const args = {
      relativePath: 'app/build.gradle',
      content:
        'react {\n    autolinkLibrariesWithApp()\n}\nnamespace "com.helloworld"\napplicationId "com.helloworld"',
      platform: 'android' as const,
      app,
    }
    expect(renderPrebuildFile(args)).toEqual(renderPrebuildFile(args))
  })
})

describe('ios scene lifecycle', () => {
  const templateAppDelegate = `@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "HelloWorld",
      in: window,
      launchOptions: launchOptions
    )

    return true
  }
}
`

  it('trims the AppDelegate to app-level work and keeps the RN delegate', () => {
    const rendered = renderPrebuildFile({
      relativePath: 'HelloWorld/AppDelegate.swift',
      content: `${templateAppDelegate}
class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
}`,
      platform: 'ios',
      app,
    })
    expect(rendered.content).toContain('@main')
    expect(rendered.content).toContain('class ReactNativeDelegate')
    expect(rendered.content).not.toContain('startReactNative')
    expect(rendered.content).not.toContain('UIWindow(frame:')
    expect(rendered.content).not.toContain('var window')
    expect(rendered.content).not.toContain('var reactNativeFactory')
  })

  it('throws instead of shipping a non-scene AppDelegate', () => {
    expect(() =>
      renderPrebuildFile({
        relativePath: 'HelloWorld/AppDelegate.swift',
        content: '@main\nclass AppDelegate: UIResponder, UIApplicationDelegate {\n}\n',
        platform: 'ios',
        app,
      })
    ).toThrow('changed shape')
  })

  it('stamps the scene manifest and delegate into the project', () => {
    const infoPlist = renderPrebuildFile({
      relativePath: 'HelloWorld/Info.plist',
      content: '<dict>\n\t<key>LSRequiresIPhoneOS</key>\n</dict>',
      platform: 'ios',
      app,
    })
    expect(infoPlist.content).toContain('<key>UIApplicationSceneManifest</key>')
    expect(infoPlist.content).toContain(
      '<string>$(PRODUCT_MODULE_NAME).SceneDelegate</string>'
    )
    expect(infoPlist.content).toContain('<key>UIWindowSceneSessionRoleApplication</key>')

    const sceneDelegate = renderSceneDelegateSwift('MyApp')
    expect(sceneDelegate).toContain('class SceneDelegate')
    expect(sceneDelegate).toContain('UIWindowSceneDelegate')
    expect(sceneDelegate).toContain('withModuleName: "MyApp"')
    expect(sceneDelegate).toContain('willConnectTo')
    expect(sceneDelegate).toContain('openURLContexts')
    expect(sceneDelegate).toContain('continue userActivity')
    expect(sceneDelegate).toContain('RCTLinkingManager')
  })

  it('throws when the template loses a scene anchor', () => {
    expect(() =>
      renderPrebuildFile({
        relativePath: 'HelloWorld/Info.plist',
        content: '<dict>\n</dict>',
        platform: 'ios',
        app,
      })
    ).toThrow('LSRequiresIPhoneOS')
    expect(() =>
      renderPrebuildFile({
        relativePath: 'HelloWorld.xcodeproj/project.pbxproj',
        content: `shellScript = ${JSON.stringify('REACT_NATIVE_XCODE="$REACT_NATIVE_PATH/scripts/react-native-xcode.sh"\n/bin/sh -c "\\"$WITH_ENVIRONMENT\\" \\"$REACT_NATIVE_XCODE\\""\n')};\nno app delegate here`,
        platform: 'ios',
        app,
      })
    ).toThrow('AppDelegate.swift anchor')
  })

  it('generates a scene project from the real template', async () => {
    const workspaceRoot = fileURLToPath(new URL('../../../..', import.meta.url))
    const output = mkdtempSync(join(tmpdir(), 'vxrn-prebuild-scene-'))
    await generateForPlatform(workspaceRoot, 'ios', app, join(output, 'ios'))

    const sceneDelegate = readFileSync(
      join(output, 'ios', 'MyApp', 'SceneDelegate.swift'),
      'utf8'
    )
    expect(sceneDelegate).toContain('withModuleName: "MyApp"')
    expect(sceneDelegate).not.toContain('HelloWorld')

    const appDelegate = readFileSync(
      join(output, 'ios', 'MyApp', 'AppDelegate.swift'),
      'utf8'
    )
    expect(appDelegate).not.toContain('startReactNative')
    expect(appDelegate).toContain('class ReactNativeDelegate')

    const infoPlist = readFileSync(join(output, 'ios', 'MyApp', 'Info.plist'), 'utf8')
    expect(infoPlist).toContain('<key>UIApplicationSceneManifest</key>')
    expect(infoPlist).toContain('<key>OneNativeNotificationsEnabled</key>')

    const project = readFileSync(
      join(output, 'ios', 'MyApp.xcodeproj', 'project.pbxproj'),
      'utf8'
    )
    expect(project).toContain('path = MyApp/SceneDelegate.swift')
    expect(project).toContain('/* SceneDelegate.swift in Sources */,')
    // no push flag: no entitlements file and no entitlement wiring.
    expect(project).not.toContain('CODE_SIGN_ENTITLEMENTS')
    expect(() => statSync(join(output, 'ios', 'MyApp', 'MyApp.entitlements'))).toThrow()
  }, 180000)

  it('shares one app entitlement file when widgets and notification push are enabled', async () => {
    const workspaceRoot = fileURLToPath(new URL('../../../..', import.meta.url))
    const output = mkdtempSync(join(tmpdir(), 'vxrn-prebuild-widget-push-'))
    await generateForPlatform(
      workspaceRoot,
      'ios',
      {
        ...app,
        notifications: { push: true },
        ios: {
          ...app.ios,
          widgets: {
            appGroup: 'group.dev.one.myapp',
            kind: 'MyAppStatus',
            displayName: 'Status',
            description: 'Current status',
          },
        },
      },
      join(output, 'ios')
    )

    const project = readFileSync(
      join(output, 'ios', 'MyApp.xcodeproj', 'project.pbxproj'),
      'utf8'
    )
    expect(project).toContain(
      'CODE_SIGN_ENTITLEMENTS = MyApp/OneAppWidgets.entitlements;'
    )
    expect(project).not.toContain('MyApp/MyApp.entitlements')
    const entitlements = readFileSync(
      join(output, 'ios', 'MyApp', 'OneAppWidgets.entitlements'),
      'utf8'
    )
    expect(entitlements).toContain('group.dev.one.myapp')
    expect(entitlements).toContain('<key>aps-environment</key>')
    expect(() => statSync(join(output, 'ios', 'MyApp', 'MyApp.entitlements'))).toThrow()
    expect(readFileSync(join(output, 'ios', 'MyApp', 'Info.plist'), 'utf8')).toContain(
      '<key>OneNativeNotificationsPush</key>'
    )
  }, 180000)
})

describe('community autolink inventory', () => {
  it('discovers installed packages through community config, sorted', async () => {
    const root = mkdtempSync(join(tmpdir(), 'vxrn-autolink-'))
    // everything resolves from the fixture root, exactly as in a real app;
    // workspace installs are linked so the test needs no network.
    const workspaceModules = fileURLToPath(
      new URL('../../../../node_modules', import.meta.url)
    )
    mkdirSync(join(root, 'node_modules', '@react-native-community'), { recursive: true })
    const { symlinkSync } = await import('node:fs')
    for (const name of [
      'cli',
      'cli-config',
      'cli-config-android',
      'cli-config-apple',
      'cli-tools',
      'cli-types',
      'template',
    ]) {
      symlinkSync(
        join(workspaceModules, '@react-native-community', name),
        join(root, 'node_modules', '@react-native-community', name)
      )
    }
    symlinkSync(
      join(workspaceModules, 'react-native-safe-area-context'),
      join(root, 'node_modules', 'react-native-safe-area-context')
    )
    symlinkSync(
      join(workspaceModules, 'react-native'),
      join(root, 'node_modules', 'react-native')
    )
    writeFileSync(
      join(root, 'package.json'),
      JSON.stringify({
        name: 'fixture',
        dependencies: {
          'react-native': '*',
          'react-native-safe-area-context': '*',
          plain: '1.0.0',
        },
      })
    )
    const configured = join(root, 'node_modules', 'configured')
    mkdirSync(configured, { recursive: true })
    writeFileSync(
      join(configured, 'package.json'),
      JSON.stringify({ name: 'configured', version: '2.0.0' })
    )
    writeFileSync(
      join(root, 'react-native.config.cjs'),
      `module.exports = {
  dependencies: {
    configured: {
      root: ${JSON.stringify(configured)},
      platforms: { ios: {}, android: {} },
    },
  },
}\n`
    )
    const plain = join(root, 'node_modules', 'plain')
    mkdirSync(plain, { recursive: true })
    writeFileSync(join(plain, 'package.json'), JSON.stringify({ name: 'plain' }))

    // generate real projects first: discovery keys off the ios Podfile and
    // the android gradle project, the same inputs pods and gradle consume.
    await generateForPlatform(root, 'ios', app)
    await generateForPlatform(root, 'android', app)

    const inventory = await getNativeDependencyInventory(root)
    expect(inventory.map((entry) => entry.name)).toEqual([
      'configured',
      'react-native-safe-area-context',
    ])
    expect(inventory.find((entry) => entry.name === 'configured')).toEqual({
      name: 'configured',
      version: '2.0.0',
      platforms: ['android', 'ios'],
    })
    expect(
      inventory.find((entry) => entry.name === 'react-native-safe-area-context')
        ?.platforms
    ).toEqual(['android', 'ios'])
  }, 180000)
})

describe('native dependency patches', () => {
  it('adds the screens activity patch only when Android autolinking finds screens', () => {
    const root = mkdtempSync(join(tmpdir(), 'vxrn-native-patches-'))
    const activityPath = join(
      root,
      'android',
      'app',
      'src',
      'main',
      'java',
      'dev',
      'one',
      'myapp',
      'MainActivity.kt'
    )
    mkdirSync(join(activityPath, '..'), { recursive: true })
    writeFileSync(
      activityPath,
      'package dev.one.myapp\n\nimport com.facebook.react.ReactActivity\n\nclass MainActivity : ReactActivity() {}\n'
    )

    applyAndroidDependencyPatches({ root, app, inventory: [] })
    expect(readFileSync(activityPath, 'utf8')).not.toContain('RNScreensFragmentFactory')

    applyAndroidDependencyPatches({
      root,
      app,
      inventory: [
        { name: 'react-native-screens', version: '4.27.0', platforms: ['android'] },
      ],
    })
    expect(readFileSync(activityPath, 'utf8')).toContain('RNScreensFragmentFactory')
  })
})

describe('generateForPlatform determinism', () => {
  it('generates complete native launch assets', async () => {
    const workspaceRoot = fileURLToPath(new URL('../../../..', import.meta.url))
    const output = mkdtempSync(join(tmpdir(), 'vxrn-prebuild-icons-'))
    const appWithIcon = {
      ...app,
      version: '9.9.9',
      ios: { ...app.ios, buildNumber: '4242' },
      android: { ...app.android, versionCode: 4242 },
      icon: {
        source: fileURLToPath(
          new URL('../../../../examples/one-basic/public/app-icon.png', import.meta.url)
        ),
        backgroundColor: '#000000',
      },
      splash: {
        source: fileURLToPath(
          new URL('../../../../examples/one-basic/public/splash.png', import.meta.url)
        ),
        backgroundColor: '#000000',
        width: 200,
      },
    }

    await generateForPlatform(workspaceRoot, 'ios', appWithIcon, join(output, 'ios'))
    await generateForPlatform(
      workspaceRoot,
      'android',
      appWithIcon,
      join(output, 'android')
    )

    expect(
      readFileSync(
        join(
          output,
          'android',
          'app',
          'src',
          'main',
          'java',
          'dev',
          'one',
          'myapp',
          'MainActivity.kt'
        ),
        'utf8'
      )
    ).not.toContain('RNScreensFragmentFactory')

    // stamping against the real community template anchors, not just fixture
    // snippets: the manifest versions must land in the generated projects.
    const generatedPbxproj = readFileSync(
      join(output, 'ios', 'MyApp.xcodeproj', 'project.pbxproj'),
      'utf8'
    )
    expect(generatedPbxproj).toContain('MARKETING_VERSION = "9.9.9";')
    expect(generatedPbxproj).toContain('CURRENT_PROJECT_VERSION = 4242;')
    expect(generatedPbxproj).not.toContain('MARKETING_VERSION = 1.0;')
    expect(generatedPbxproj).not.toContain('CURRENT_PROJECT_VERSION = 1;')
    const generatedGradle = readFileSync(
      join(output, 'android', 'app', 'build.gradle'),
      'utf8'
    )
    expect(generatedGradle).toContain('versionCode 4242')
    expect(generatedGradle).toContain('versionName "9.9.9"')

    const iosIconDir = join(
      output,
      'ios',
      'MyApp',
      'Images.xcassets',
      'AppIcon.appiconset'
    )
    const iosContents: { images: Array<{ filename?: string }> } = JSON.parse(
      readFileSync(join(iosIconDir, 'Contents.json'), 'utf8')
    )
    expect(iosContents.images).toHaveLength(9)
    expect(iosContents.images.every((image) => image.filename)).toBe(true)
    const iosMarketing = await sharp(join(iosIconDir, 'icon-1024.png')).metadata()
    expect(iosMarketing).toMatchObject({ width: 1024, height: 1024, hasAlpha: false })

    const androidIcon = await sharp(
      join(
        output,
        'android',
        'app',
        'src',
        'main',
        'res',
        'mipmap-xxxhdpi',
        'ic_launcher.png'
      )
    ).metadata()
    expect(androidIcon).toMatchObject({ width: 192, height: 192 })
    const iosApp = join(output, 'ios', 'MyApp')
    expect(
      await sharp(
        join(iosApp, 'Images.xcassets', 'Splash.imageset', 'splash.png')
      ).metadata()
    ).toMatchObject({ width: 710, height: 209 })
    const launchStoryboard = readFileSync(join(iosApp, 'LaunchScreen.storyboard'), 'utf8')
    expect(launchStoryboard).toContain('image="Splash"')
    expect(launchStoryboard).toContain('firstAttribute="centerX"')
    expect(launchStoryboard).toContain('firstAttribute="centerY"')
    expect(launchStoryboard).toContain('firstAttribute="width" constant="200"')
    expect(launchStoryboard).toContain('firstAttribute="height" constant="58.873"')
    const androidRes = join(output, 'android', 'app', 'src', 'main', 'res')
    const splashMdpiPath = join(androidRes, 'drawable-mdpi', 'splash.png')
    const splashMdpi = await sharp(splashMdpiPath).metadata()
    expect(splashMdpi).toMatchObject({ width: 288, height: 288, hasAlpha: true })
    const { info: containedArtwork } = await sharp(splashMdpiPath)
      .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer({ resolveWithObject: true })
    expect(containedArtwork).toMatchObject({ width: 200, height: 59 })
    expect(
      await sharp(join(androidRes, 'drawable-xxxhdpi', 'splash.png')).metadata()
    ).toMatchObject({ width: 1152, height: 1152, hasAlpha: true })
    // legacy android centers a density-aware square whose artwork was aspect-fit at generation
    const launchScreen = readFileSync(
      join(androidRes, 'drawable', 'launch_screen.xml'),
      'utf8'
    )
    expect(launchScreen).toContain('@drawable/splash')
    expect(launchScreen).toContain('android:gravity="center"')
    expect(launchScreen).not.toContain('android:gravity="fill"')
    expect(() => statSync(join(androidRes, 'drawable-nodpi', 'splash.png'))).toThrow()
    expect(readFileSync(join(androidRes, 'values', 'colors.xml'), 'utf8')).toContain(
      '<color name="splash_background">#000000</color>'
    )
    expect(readFileSync(join(androidRes, 'values', 'styles.xml'), 'utf8')).toContain(
      '@drawable/launch_screen'
    )
    // android 12+ uses the configured splash image, never the launcher icon
    const stylesV31 = readFileSync(join(androidRes, 'values-v31', 'styles.xml'), 'utf8')
    expect(stylesV31).toContain('@color/splash_background')
    expect(stylesV31).toContain(
      'android:windowSplashScreenAnimatedIcon">@drawable/splash'
    )
    expect(stylesV31).not.toContain('ic_launcher')
  }, 180000)

  it('regenerates byte-identical projects from the same manifest', async () => {
    // root stays the workspace so the installed community template resolves;
    // output goes to isolated temp dirs, never the repo.
    const workspaceRoot = fileURLToPath(new URL('../../../..', import.meta.url))
    const snapshot = (dir: string): Array<[string, string]> => {
      const out: Array<[string, string]> = []
      const walkDir = (current: string) => {
        for (const entry of readdirSync(current).sort()) {
          const full = join(current, entry)
          if (statSync(full).isDirectory()) walkDir(full)
          else {
            const buffer = readFileSync(full)
            out.push([relative(dir, full), buffer.toString('base64')])
          }
        }
      }
      walkDir(dir)
      return out
    }
    const first = mkdtempSync(join(tmpdir(), 'vxrn-prebuild-a-'))
    const second = mkdtempSync(join(tmpdir(), 'vxrn-prebuild-b-'))
    await generateForPlatform(workspaceRoot, 'ios', app, join(first, 'ios'))
    await generateForPlatform(workspaceRoot, 'ios', app, join(second, 'ios'))
    await generateForPlatform(workspaceRoot, 'android', app, join(first, 'android'))
    await generateForPlatform(workspaceRoot, 'android', app, join(second, 'android'))
    const screensInventory = [
      { name: 'react-native-screens', version: '4.27.0', platforms: ['android'] },
    ]
    applyAndroidDependencyPatches({
      root: first,
      app,
      inventory: screensInventory,
    })
    applyAndroidDependencyPatches({
      root: second,
      app,
      inventory: screensInventory,
    })
    expect(snapshot(first)).toEqual(snapshot(second))

    const pbxproj = readFileSync(
      join(first, 'ios', 'MyApp.xcodeproj', 'project.pbxproj'),
      'utf8'
    )
    expect(pbxproj).toContain('PRODUCT_BUNDLE_IDENTIFIER = "dev.one.myapp"')
    expect(pbxproj).toContain('IPHONEOS_DEPLOYMENT_TARGET = 17.0;')
    expect(pbxproj).toContain('[vxrn/one] React Native now defaults CLI_PATH')
    expect(pbxproj).toContain('[vxrn/one] use the hermes-engine pod')
    expect(pbxproj).toContain('[vxrn/one] ensure patches are applied')
    const podfile = readFileSync(join(first, 'ios', 'Podfile'), 'utf8')
    expect(podfile).toContain("platform :ios, '17.0'")
    expect(podfile).toContain(
      "config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '17.0'"
    )
    expect(podfile).toContain('[vxrn/one] fmt c++17 fix')
    expect(podfile).toContain('[vxrn/one] minify iOS Hermes Release bundle input')
    const gradle = readFileSync(join(first, 'android', 'app', 'build.gradle'), 'utf8')
    expect(gradle).toContain('applicationId "dev.one.myapp"')
    expect(gradle).toContain('entryFile = file("../../package.json")')
    expect(gradle).toContain(
      'hermesCommand = new File(file(resolveReactNativeDependency("hermes-compiler/package.json")).parentFile, "hermesc/%OS-BIN%/hermesc").absolutePath'
    )
    expect(gradle).toContain('[vxrn/one] ensure patches are applied')
    const rootGradle = readFileSync(join(first, 'android', 'build.gradle'), 'utf8')
    expect(rootGradle).toContain('minSdkVersion = 28')
    const mainActivity = readFileSync(
      join(
        first,
        'android',
        'app',
        'src',
        'main',
        'java',
        'dev',
        'one',
        'myapp',
        'MainActivity.kt'
      ),
      'utf8'
    )
    expect(mainActivity).toContain('RNScreensFragmentFactory')
  }, 180000)
})

describe('ios widgets', () => {
  const widgetsApp = {
    ...app,
    ios: {
      ...app.ios,
      widgets: {
        appGroup: 'group.dev.one.myapp',
        kind: 'MyAppStatus',
        displayName: 'My status',
        description: 'Current status',
      },
    },
  } satisfies PrebuildAppConfig

  it('generates one extension target with consistent ids and a null push token', async () => {
    const workspaceRoot = fileURLToPath(new URL('../../../..', import.meta.url))
    const output = mkdtempSync(join(tmpdir(), 'vxrn-prebuild-widgets-'))
    await generateForPlatform(workspaceRoot, 'ios', widgetsApp, join(output, 'ios'))

    const project = readFileSync(
      join(output, 'ios', 'MyApp.xcodeproj', 'project.pbxproj'),
      'utf8'
    )
    // one extension target, not duplicated
    expect(project.match(/\/\* OneWidgets \*\/ = \{isa = PBXNativeTarget/g)).toHaveLength(
      1
    )
    expect(project).toContain('PRODUCT_BUNDLE_IDENTIFIER = dev.one.myapp.widgets;')
    expect(project).toContain(
      'CODE_SIGN_ENTITLEMENTS = OneWidgets/OneWidgets.entitlements;'
    )
    expect(project).toContain(
      'CODE_SIGN_ENTITLEMENTS = MyApp/OneAppWidgets.entitlements;'
    )
    // the extension follows the app onto ipad instead of staying iphone-only
    const families = [...project.matchAll(/TARGETED_DEVICE_FAMILY = "([^"]+)";/g)].map(
      (match) => match[1]
    )
    expect(families.length).toBeGreaterThan(0)
    expect(new Set(families)).toEqual(new Set(['1,2']))

    const readGenerated = (relativePath: string) =>
      readFileSync(join(output, 'ios', relativePath), 'utf8')
    // the same app group lands in both entitlements and the shared swift
    // contract the app and the extension compile together
    for (const relativePath of [
      'OneWidgets/OneWidgets.entitlements',
      'MyApp/OneAppWidgets.entitlements',
      'MyApp/OneWidgetContract.swift',
    ]) {
      expect(readGenerated(relativePath)).toContain('group.dev.one.myapp')
    }
    expect(readGenerated('OneWidgets/WidgetInfo.plist')).toContain('My status')
    expect(readGenerated('MyApp/Info.plist')).toContain('NSSupportsLiveActivities')
    expect(readGenerated('OneWidgets/OneWidget.swift')).toContain('OneLiveActivity()')
    const bridge = readGenerated('MyApp/OneWidgetsBridge.swift')
    expect(bridge).toContain('func pushToken')
    // a missing activitykit push token resolves null, matching the typed
    // contract, instead of the undefined a bare nil resolve produces
    expect(bridge).toContain('resolve(NSNull())')
  }, 180000)

  it('renders every WidgetUI node and slot the serializer can emit', async () => {
    const workspaceRoot = fileURLToPath(new URL('../../../..', import.meta.url))
    const output = mkdtempSync(join(tmpdir(), 'vxrn-prebuild-widgets-jsx-'))
    await generateForPlatform(workspaceRoot, 'ios', widgetsApp, join(output, 'ios'))

    const readGenerated = (relativePath: string) =>
      readFileSync(join(output, 'ios', relativePath), 'utf8')
    const rendered = readGenerated('OneWidgets/OneWidget.swift')
    // every node type packages/one/src/platform/widgets/view.ts can emit needs a
    // Swift decode path, or the extension renders a blank subtree
    for (const type of [
      'text',
      'vstack',
      'hstack',
      'zstack',
      'spacer',
      'divider',
      'image',
      'progress',
      'gauge',
      'circle',
      'rectangle',
      'rounded-rectangle',
      'link',
    ]) {
      expect(rendered).toContain(`case "${type}":`)
    }
    // every ActivityView slot needs a decode path in both presentations
    for (const slot of [
      'lockScreen',
      'compactLeading',
      'compactTrailing',
      'minimal',
      'expandedLeading',
      'expandedTrailing',
      'expandedBottom',
    ]) {
      expect(rendered).toContain(slot)
    }
    // the JSX bridge methods exist on both sides of the React Native bridge
    for (const method of ['writeView', 'startView', 'updateView']) {
      expect(readGenerated('MyApp/OneWidgetsBridge.swift')).toContain(method)
      expect(readGenerated('MyApp/OneWidgetsBridge.m')).toContain(method)
    }
    // the shared contract carries the serialized layouts
    const contract = readGenerated('MyApp/OneWidgetContract.swift')
    expect(contract.match(/let layout: String\?/g)).toHaveLength(2)
  }, 180000)

  it('regenerates byte-identical widget projects and adds nothing without the config', async () => {
    const workspaceRoot = fileURLToPath(new URL('../../../..', import.meta.url))
    const first = mkdtempSync(join(tmpdir(), 'vxrn-prebuild-widgets-a-'))
    const second = mkdtempSync(join(tmpdir(), 'vxrn-prebuild-widgets-b-'))
    await generateForPlatform(workspaceRoot, 'ios', widgetsApp, join(first, 'ios'))
    await generateForPlatform(workspaceRoot, 'ios', widgetsApp, join(second, 'ios'))
    const snapshot = (dir: string): Array<[string, string]> => {
      const out: Array<[string, string]> = []
      const walkDir = (current: string) => {
        for (const entry of readdirSync(current).sort()) {
          const full = join(current, entry)
          if (statSync(full).isDirectory()) walkDir(full)
          else out.push([relative(dir, full), readFileSync(full).toString('base64')])
        }
      }
      walkDir(dir)
      return out
    }
    expect(snapshot(first)).toEqual(snapshot(second))

    const plain = mkdtempSync(join(tmpdir(), 'vxrn-prebuild-nowidgets-'))
    await generateForPlatform(workspaceRoot, 'ios', app, join(plain, 'ios'))
    const plainProject = readFileSync(
      join(plain, 'ios', 'MyApp.xcodeproj', 'project.pbxproj'),
      'utf8'
    )
    expect(plainProject).not.toContain('OneWidgets')
    expect(() => statSync(join(plain, 'ios', 'OneWidgets'))).toThrow()
    expect(() =>
      statSync(join(plain, 'ios', 'MyApp', 'OneWidgetsBridge.swift'))
    ).toThrow()
    expect(readFileSync(join(plain, 'ios', 'MyApp', 'Info.plist'), 'utf8')).not.toContain(
      'NSSupportsLiveActivities'
    )
  }, 180000)

  it('merges the app group into the push entitlements instead of a duplicate setting', async () => {
    const workspaceRoot = fileURLToPath(new URL('../../../..', import.meta.url))
    const output = mkdtempSync(join(tmpdir(), 'vxrn-prebuild-widgets-push-'))
    await generateForPlatform(
      workspaceRoot,
      'ios',
      { ...widgetsApp, notifications: { push: true } },
      join(output, 'ios')
    )

    const project = readFileSync(
      join(output, 'ios', 'MyApp.xcodeproj', 'project.pbxproj'),
      'utf8'
    )
    // one CODE_SIGN_ENTITLEMENTS per app configuration carries both grants.
    expect(
      project.match(/CODE_SIGN_ENTITLEMENTS = MyApp\/OneAppWidgets\.entitlements;/g)
    ).toHaveLength(2)
    expect(project).not.toContain('CODE_SIGN_ENTITLEMENTS = MyApp/MyApp.entitlements;')
    expect(() => statSync(join(output, 'ios', 'MyApp', 'MyApp.entitlements'))).toThrow()
    const appEntitlements = readFileSync(
      join(output, 'ios', 'MyApp', 'OneAppWidgets.entitlements'),
      'utf8'
    )
    expect(appEntitlements).toContain('<key>aps-environment</key>')
    expect(appEntitlements).toContain('group.dev.one.myapp')
  }, 180000)
})

describe('swift cxx interop', () => {
  it('maps the same package names as prebuild and rejects collisions', () => {
    const root = mkdtempSync(join(tmpdir(), 'vxrn-swift-package-map-'))
    const first = join(root, 'features', 'my-badge')
    const second = join(root, 'other', 'counter')
    mkdirSync(first, { recursive: true })
    mkdirSync(second, { recursive: true })
    writeFileSync(join(first, 'Package.swift'), '')
    writeFileSync(join(second, 'Package.swift'), '')
    const packages = swiftPackageDirectories(root)
    expect(packages.size).toBe(2)
    expect(packages.get('my_badge')).toBe(first)
    expect(packages.get('counter')).toBe(second)
    const duplicate = join(root, 'other', 'my_badge')
    mkdirSync(duplicate)
    writeFileSync(join(duplicate, 'Package.swift'), '')
    expect(() => swiftPackageDirectories(root)).toThrow(/both have name my_badge/)
  })

  it('emits cxx flags for swift packages', async () => {
    const root = mkdtempSync(join(tmpdir(), 'vxrn-prebuild-swift-cxx-'))
    const workspaceModules = fileURLToPath(
      new URL('../../../../node_modules', import.meta.url)
    )
    mkdirSync(join(root, 'node_modules', '@react-native-community'), { recursive: true })
    const { symlinkSync } = await import('node:fs')
    for (const name of ['cli', 'template']) {
      symlinkSync(
        join(workspaceModules, '@react-native-community', name),
        join(root, 'node_modules', '@react-native-community', name)
      )
    }
    const pkgDir = join(root, 'MyFeature')
    mkdirSync(join(pkgDir, 'Sources'), { recursive: true })
    writeFileSync(join(pkgDir, 'Package.swift'), '// swift-tools-version: 5.9\n')
    writeFileSync(
      join(pkgDir, 'Sources', 'Feature.swift'),
      'import One\npublic func probe() { OneNativeRegisteredValue.register("x", for: "x") }\n'
    )
    await generateForPlatform(root, 'ios', app)
    const podspec = readFileSync(
      join(root, 'ios', 'OneSwiftPackages', 'MyFeature', 'MyFeature.podspec'),
      'utf8'
    )
    expect(podspec).toContain(
      '$(inherited) -cxx-interoperability-mode=default -Xcc -std=c++20'
    )
    expect(podspec).toContain('-Xfrontend -import-module -Xfrontend One')
  }, 180000)
})

describe('one updates prebuild', () => {
  const updatesApp = {
    ...app,
    updates: { url: 'https://updates.example.com', runtimeVersion: 'test-1' },
  } satisfies PrebuildAppConfig

  const templateAppDelegate = `import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "HelloWorld",
      in: window,
      launchOptions: launchOptions
    )

    return true
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
`

  it('validates the updates config', () => {
    expect(() => validatePrebuildApp(updatesApp)).not.toThrow()
    expect(() =>
      validatePrebuildApp({
        ...app,
        updates: { runtimeVersion: 'test-1' },
      })
    ).not.toThrow()
    expect(() =>
      validatePrebuildApp({ ...app, updates: {} } as any)
    ).toThrow(/updates\.runtimeVersion/)
    expect(() =>
      validatePrebuildApp({ ...app, updates: { runtimeVersion: '' } })
    ).toThrow(/updates\.runtimeVersion/)
    expect(() =>
      validatePrebuildApp({
        ...app,
        updates: { url: '', runtimeVersion: 'test-1' },
      })
    ).toThrow(/updates\.url/)
  })

  it('points the release bundleURL at the launcher', () => {
    const rendered = renderPrebuildFile({
      relativePath: 'HelloWorld/AppDelegate.swift',
      content: templateAppDelegate,
      platform: 'ios',
      app: updatesApp,
    })
    expect(rendered.content).toContain('OneUpdatesBundleURL()')
    expect(rendered.content).not.toContain('import One')
    expect(rendered.content).not.toContain('Bundle.main.url(forResource: "main"')
    expect(rendered.content).toContain('#if DEBUG')

    const plain = renderPrebuildFile({
      relativePath: 'HelloWorld/AppDelegate.swift',
      content: templateAppDelegate,
      platform: 'ios',
      app,
    })
    expect(plain.content).not.toContain('OneUpdatesBundleURL')
    expect(plain.content).toContain('Bundle.main.url(forResource: "main"')
  })

  it('points the app target at the updates bridging header', () => {
    const configs = `buildSettings = {
\t\t\t\tINFOPLIST_FILE = MyApp/Info.plist;
\t\t\t};
\t\t\tname = Debug;
buildSettings = {
\t\t\t\tINFOPLIST_FILE = MyApp/Info.plist;
\t\t\t};
\t\t\tname = Release;`
    const project = `shellScript = ${JSON.stringify('REACT_NATIVE_XCODE="$REACT_NATIVE_PATH/scripts/react-native-xcode.sh"\n/bin/sh -c "\\""$WITH_ENVIRONMENT\\"" \\""$REACT_NATIVE_XCODE\\"""\n')};\n${'/* AppDelegate.swift in Sources */ = {isa = PBXBuildFile;'}\n${'/* AppDelegate.swift */ = {isa = PBXFileReference;'}\n${'/* AppDelegate.swift */,'}\n${'/* AppDelegate.swift in Sources */,'}\n${configs}`
    const rendered = renderPrebuildFile({
      relativePath: 'MyApp.xcodeproj/project.pbxproj',
      content: project,
      platform: 'ios',
      app: updatesApp,
    })
    expect(rendered.content).toContain(
      'SWIFT_OBJC_BRIDGING_HEADER = "MyApp/OneUpdates-Bridging-Header.h";'
    )
    expect(
      (rendered.content ?? '').split(
        'SWIFT_OBJC_BRIDGING_HEADER = "MyApp/OneUpdates-Bridging-Header.h";'
      )
        .length - 1
    ).toBe(2)

    const plain = renderPrebuildFile({
      relativePath: 'MyApp.xcodeproj/project.pbxproj',
      content: project,
      platform: 'ios',
      app,
    })
    expect(plain.content).not.toContain('SWIFT_OBJC_BRIDGING_HEADER')

    const missing = project.replaceAll('INFOPLIST_FILE = MyApp/Info.plist;', 'INFOPLIST = x;')
    expect(() =>
      renderPrebuildFile({
        relativePath: 'MyApp.xcodeproj/project.pbxproj',
        content: missing,
        platform: 'ios',
        app: updatesApp,
      })
    ).toThrow('bridging header')
  })

  it('throws instead of shipping a stock bundleURL with updates configured', () => {
    expect(() =>
      renderPrebuildFile({
        relativePath: 'HelloWorld/AppDelegate.swift',
        content: templateAppDelegate.replace('Bundle.main.url', 'Bundle.main.path'),
        platform: 'ios',
        app: updatesApp,
      })
    ).toThrow('One.Updates')
  })

  it('stamps the updates url and runtime version into Info.plist', () => {
    const plist = renderPrebuildFile({
      relativePath: 'HelloWorld/Info.plist',
      content: '<dict>\n\t<key>LSRequiresIPhoneOS</key>\n</dict>',
      platform: 'ios',
      app: updatesApp,
    })
    expect(plist.content).toContain('<key>OneUpdatesURL</key>')
    expect(plist.content).toContain('<string>https://updates.example.com</string>')
    expect(plist.content).toContain('<key>OneUpdatesRuntimeVersion</key>')
    expect(plist.content).toContain('<string>test-1</string>')

    const noUrl = renderPrebuildFile({
      relativePath: 'HelloWorld/Info.plist',
      content: '<dict>\n\t<key>LSRequiresIPhoneOS</key>\n</dict>',
      platform: 'ios',
      app: { ...app, updates: { runtimeVersion: 'test-1' } },
    })
    expect(noUrl.content).not.toContain('<key>OneUpdatesURL</key>')
    expect(noUrl.content).toContain('<key>OneUpdatesRuntimeVersion</key>')

    const plain = renderPrebuildFile({
      relativePath: 'HelloWorld/Info.plist',
      content: '<dict>\n\t<key>LSRequiresIPhoneOS</key>\n</dict>',
      platform: 'ios',
      app,
    })
    expect(plain.content).not.toContain('OneUpdates')
  })

  it('writes the embedded manifest from the ios bundle phase', () => {
    const phase = `shellScript = ${JSON.stringify('REACT_NATIVE_XCODE="$REACT_NATIVE_PATH/scripts/react-native-xcode.sh"\n/bin/sh -c "\\""$WITH_ENVIRONMENT\\"" \\""$REACT_NATIVE_XCODE\\"""\n')};\n${'/* AppDelegate.swift in Sources */ = {isa = PBXBuildFile;'}\n${'/* AppDelegate.swift */ = {isa = PBXFileReference;'}\n${'/* AppDelegate.swift */,'}\n${'/* AppDelegate.swift in Sources */,'}\nINFOPLIST_FILE = MyApp/Info.plist;\nINFOPLIST_FILE = MyApp/Info.plist;`
    const rendered = renderPrebuildFile({
      relativePath: 'HelloWorld.xcodeproj/project.pbxproj',
      content: phase,
      platform: 'ios',
      app: updatesApp,
    })
    expect(rendered.content).toContain(
      '[vxrn/one] the embedded update manifest lands beside the release bundle'
    )
    expect(rendered.content).toContain('one-updates-embedded.json')
    expect(rendered.content).toContain('runtimeVersion: \\"test-1\\"')

    const plain = renderPrebuildFile({
      relativePath: 'HelloWorld.xcodeproj/project.pbxproj',
      content: phase,
      platform: 'ios',
      app,
    })
    expect(plain.content).not.toContain('one-updates-embedded.json')
  })

  it('points MainApplication at the One host factory', () => {
    const templateMainApplication = `package com.helloworld

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
`
    const rendered = renderPrebuildFile({
      relativePath: 'app/src/main/java/com/helloworld/MainApplication.kt',
      content: templateMainApplication,
      platform: 'android',
      app: updatesApp,
    })
    expect(rendered.content).toContain(
      'import com.margelo.nitro.one.OneUpdatesReactHost.getDefaultReactHost'
    )
    expect(rendered.content).not.toContain('DefaultReactHost.getDefaultReactHost')

    const plain = renderPrebuildFile({
      relativePath: 'app/src/main/java/com/helloworld/MainApplication.kt',
      content: templateMainApplication,
      platform: 'android',
      app,
    })
    expect(plain.content).toContain('DefaultReactHost.getDefaultReactHost')

    expect(() =>
      renderPrebuildFile({
        relativePath: 'app/src/main/java/com/helloworld/MainApplication.kt',
        content: 'package com.helloworld\n',
        platform: 'android',
        app: updatesApp,
      })
    ).toThrow('One.Updates')
  })

  it('stamps the updates config into the android manifest', () => {
    const manifest = `<manifest>
    <uses-permission android:name="android.permission.INTERNET" />
    <application>
      <activity android:name=".MainActivity">
      </activity>
    </application>
</manifest>`
    const rendered = renderPrebuildFile({
      relativePath: 'app/src/main/AndroidManifest.xml',
      content: manifest,
      platform: 'android',
      app: updatesApp,
    })
    expect(rendered.content).toContain(
      '<meta-data android:name="dev.onejs.updates.url" android:value="https://updates.example.com" />'
    )
    expect(rendered.content).toContain(
      '<meta-data android:name="dev.onejs.updates.runtimeVersion" android:value="test-1" />'
    )
  })

  it('writes the embedded manifest from the android bundle task', () => {
    const rendered = renderPrebuildFile({
      relativePath: 'app/build.gradle',
      content: 'react {\n    entryFile = file("x")\n}\n',
      platform: 'android',
      app: updatesApp,
    })
    expect(rendered.content).toContain(
      '[vxrn/one] the embedded update manifest lands beside the release bundle'
    )
    expect(rendered.content).toContain('one-updates-embedded.json')
    expect(rendered.content).toContain('runtimeVersion: "test-1"')

    const plain = renderPrebuildFile({
      relativePath: 'app/build.gradle',
      content: 'react {\n    entryFile = file("x")\n}\n',
      platform: 'android',
      app,
    })
    expect(plain.content).not.toContain('one-updates-embedded.json')
  })
})
