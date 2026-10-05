import { execFileSync } from 'node:child_process'
import {
  mkdtempSync,
  mkdirSync,
  readdirSync,
  existsSync,
  readFileSync,
  realpathSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { swiftPackageDirectories } from '../utils/swiftPackageId'
import {
  applyAndroidDependencyPatches,
  enableAppComposeIntegration,
  generateForPlatform,
  generateKotlinSources,
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

const templateRnDelegate = readFileSync(
  fileURLToPath(
    new URL(
      '../../../../node_modules/@react-native-community/template/template/ios/HelloWorld/AppDelegate.swift',
      import.meta.url
    )
  ),
  'utf8'
).split('class ReactNativeDelegate:')[1]

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

// the template's AppDelegate entries, which the scene delegate patch anchors
// on, and its two app-target plist settings, beside which the bridging header
// setting lands
const APP_DELEGATE_PBXPROJ = `\t\t761780ED2CA45674006654EE /* AppDelegate.swift in Sources */ = {isa = PBXBuildFile; fileRef = 761780EC2CA45674006654EE /* AppDelegate.swift */; };
\t\t761780EC2CA45674006654EE /* AppDelegate.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; name = AppDelegate.swift; path = HelloWorld/AppDelegate.swift; sourceTree = "<group>"; };
\t\t\t\t761780EC2CA45674006654EE /* AppDelegate.swift */,
\t\t\t\t761780ED2CA45674006654EE /* AppDelegate.swift in Sources */,
\t\t\t\tINFOPLIST_FILE = HelloWorld/Info.plist;
\t\t\t\tINFOPLIST_FILE = HelloWorld/Info.plist;`

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

    const audioPlist = renderPrebuildFile({
      relativePath: 'HelloWorld/Info.plist',
      content: '<dict>\n\t<key>LSRequiresIPhoneOS</key>\n</dict>',
      platform: 'ios',
      app: { ...app, speech: undefined, audio: { microphone: 'Record notes & ideas' } },
    })
    expect(audioPlist.content).toContain(
      '<key>NSMicrophoneUsageDescription</key>\n\t<string>Record notes &amp; ideas</string>'
    )
    expect(audioPlist.content).not.toContain('NSSpeechRecognitionUsageDescription')

    const backgroundAudioPlist = renderPrebuildFile({
      relativePath: 'HelloWorld/Info.plist',
      content: '<dict>\n\t<key>LSRequiresIPhoneOS</key>\n</dict>',
      platform: 'ios',
      app: { ...app, speech: undefined, audio: { background: true } },
    })
    expect(backgroundAudioPlist.content?.match(/<key>UIBackgroundModes<\/key>/g)).toHaveLength(1)
    expect(backgroundAudioPlist.content?.match(/<string>audio<\/string>/g)).toHaveLength(1)
    expect(backgroundAudioPlist.content).not.toContain('NSMicrophoneUsageDescription')

    const pipAndAudioPlist = renderPrebuildFile({
      relativePath: 'HelloWorld/Info.plist',
      content: '<dict>\n\t<key>LSRequiresIPhoneOS</key>\n</dict>',
      platform: 'ios',
      app: { ...app, pictureInPicture: true, audio: { background: true } },
    })
    expect(pipAndAudioPlist.content?.match(/<key>UIBackgroundModes<\/key>/g)).toHaveLength(1)

    const speechAndAudioPlist = renderPrebuildFile({
      relativePath: 'HelloWorld/Info.plist',
      content: '<dict>\n\t<key>LSRequiresIPhoneOS</key>\n</dict>',
      platform: 'ios',
      app: { ...app, audio: { microphone: 'Record notes & ideas' } },
    })
    expect(speechAndAudioPlist.content?.match(/<key>NSMicrophoneUsageDescription<\/key>/g))
      .toHaveLength(1)
    expect(speechAndAudioPlist.content).toContain(
      '<key>NSMicrophoneUsageDescription</key>\n\t<string>Record notes &amp; ideas</string>'
    )

    const locationPlist = renderPrebuildFile({
      relativePath: 'HelloWorld/Info.plist',
      content:
        '<dict>\n\t<key>LSRequiresIPhoneOS</key>\n\t<key>NSLocationWhenInUseUsageDescription</key>\n\t<string></string>\n</dict>',
      platform: 'ios',
      app: { ...app, location: { whenInUse: 'Find nearby cafés & parks' } },
    })
    if (locationPlist.content === null) throw new Error('location Info.plist was not rendered')
    expect(
      locationPlist.content.match(/<key>NSLocationWhenInUseUsageDescription<\/key>/g)
    ).toHaveLength(1)
    expect(locationPlist.content).toContain(
      '<key>NSLocationWhenInUseUsageDescription</key>\n\t<string>Find nearby cafés &amp; parks</string>'
    )

    const noLocationPlist = renderPrebuildFile({
      relativePath: 'HelloWorld/Info.plist',
      content:
        '<dict>\n\t<key>LSRequiresIPhoneOS</key>\n\t<key>NSLocationWhenInUseUsageDescription</key>\n\t<string></string>\n</dict>',
      platform: 'ios',
      app,
    })
    expect(noLocationPlist.content).not.toContain('NSLocationWhenInUseUsageDescription')

    const backgroundLocationPlist = renderPrebuildFile({
      relativePath: 'HelloWorld/Info.plist',
      content: '<dict>\n\t<key>LSRequiresIPhoneOS</key>\n</dict>',
      platform: 'ios',
      app: { ...app, location: { whenInUse: 'Track a hike.', background: true },
        audio: { background: true } },
    })
    expect(backgroundLocationPlist.content?.match(/<key>UIBackgroundModes<\/key>/g)).toHaveLength(1)
    expect(backgroundLocationPlist.content).toContain('<string>audio</string>')
    expect(backgroundLocationPlist.content).toContain('<string>location</string>')

    const photoPlist = renderPrebuildFile({
      relativePath: 'HelloWorld/Info.plist',
      content:
        '<dict>\n\t<key>LSRequiresIPhoneOS</key>\n\t<key>NSPhotoLibraryAddUsageDescription</key>\n\t<string></string>\n</dict>',
      platform: 'ios',
      app: { ...app, photoLibrary: {
        addOnly: 'Save photos & videos', readWrite: 'Browse photos & videos',
      } },
    })
    expect(photoPlist.content?.match(/<key>NSPhotoLibraryAddUsageDescription<\/key>/g))
      .toHaveLength(1)
    expect(photoPlist.content).toContain(
      '<key>NSPhotoLibraryAddUsageDescription</key>\n\t<string>Save photos &amp; videos</string>'
    )
    expect(photoPlist.content?.match(/<key>NSPhotoLibraryUsageDescription<\/key>/g))
      .toHaveLength(1)
    expect(photoPlist.content).toContain(
      '<key>NSPhotoLibraryUsageDescription</key>\n\t<string>Browse photos &amp; videos</string>'
    )
    expect(photoPlist.content).toContain(
      '<key>PHPhotoLibraryPreventAutomaticLimitedAccessAlert</key>\n\t<true/>'
    )
    const readWritePhotoPlist = renderPrebuildFile({
      relativePath: 'HelloWorld/Info.plist',
      content: '<dict>\n\t<key>LSRequiresIPhoneOS</key>\n\t<true/>\n</dict>',
      platform: 'ios',
      app: { ...app, photoLibrary: { readWrite: 'Browse photos' } },
    })
    expect(readWritePhotoPlist.content).toContain('<key>NSPhotoLibraryUsageDescription</key>')
    expect(readWritePhotoPlist.content).toContain(
      '<key>PHPhotoLibraryPreventAutomaticLimitedAccessAlert</key>\n\t<true/>'
    )
    expect(readWritePhotoPlist.content).not.toContain('NSPhotoLibraryAddUsageDescription')

    const contactsPlist = renderPrebuildFile({
      relativePath: 'HelloWorld/Info.plist',
      content: '<dict>\n\t<key>LSRequiresIPhoneOS</key>\n</dict>',
      platform: 'ios',
      app: { ...app, contacts: { usage: 'Find people & friends' } },
    })
    expect(contactsPlist.content).toContain(
      '<key>NSContactsUsageDescription</key>\n\t<string>Find people &amp; friends</string>'
    )

    const calendarPlist = renderPrebuildFile({
      relativePath: 'HelloWorld/Info.plist',
      content: '<dict>\n\t<key>LSRequiresIPhoneOS</key>\n</dict>',
      platform: 'ios',
      app: { ...app, calendar: { usage: 'Show events & meetings', remindersUsage: 'Manage tasks & plans' } },
    })
    expect(calendarPlist.content).toContain(
      '<key>NSCalendarsFullAccessUsageDescription</key>\n\t<string>Show events &amp; meetings</string>'
    )
    expect(calendarPlist.content).toContain(
      '<key>NSRemindersFullAccessUsageDescription</key>\n\t<string>Manage tasks &amp; plans</string>'
    )

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
includeBuild('../node_modules/@react-native/gradle-plugin')
extensions.configure(com.facebook.react.ReactSettingsExtension){ ex -> ex.autolinkLibrariesFromCommand() }`,
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

  it('stamps Android media permissions and markers from native.app', () => {
    const media = {
      ...app,
      audio: { microphone: 'Record audio', background: true },
      photoLibrary: { addOnly: 'Save photos', readWrite: 'Read photos' },
      contacts: { usage: 'Find people' },
      calendar: { usage: 'Show events' },
    } satisfies PrebuildAppConfig
    const manifest = renderPrebuildFile({
      relativePath: 'app/src/main/AndroidManifest.xml',
      content:
        '<manifest>\n    <uses-permission android:name="android.permission.INTERNET" />\n    <activity>\n      </activity>\n    </application>',
      platform: 'android',
      app: media,
    })
    for (const permission of [
      'android.permission.RECORD_AUDIO',
      'android.permission.READ_MEDIA_IMAGES',
      'android.permission.READ_MEDIA_VIDEO',
      'android.permission.READ_CONTACTS',
      'android.permission.WRITE_CONTACTS',
      'android.permission.READ_CALENDAR',
      'android.permission.WRITE_CALENDAR',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
    ]) {
      expect(manifest.content).toContain(permission)
    }
    expect(manifest.content).toContain(
      '<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />'
    )
    expect(manifest.content).toContain(
      '<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" />'
    )
    expect(manifest.content).toContain('one.photoLibrary.addOnly')
    expect(manifest.content).toContain('one.audio.background')
    expect(manifest.content).toContain('com.margelo.nitro.one.OneAudioService')
    expect(manifest.content).toContain('android:foregroundServiceType="mediaPlayback"')
    // speech stamps RECORD_AUDIO first; the media block must not duplicate it.
    expect(
      manifest.content.split('android.permission.RECORD_AUDIO').length - 1
    ).toBe(1)

    const bare = renderPrebuildFile({
      relativePath: 'app/src/main/AndroidManifest.xml',
      content:
        '<manifest>\n    <uses-permission android:name="android.permission.INTERNET" />\n    <activity>\n      </activity>\n    </application>',
      platform: 'android',
      app: {
        ...app,
        audio: undefined,
        photoLibrary: undefined,
        contacts: undefined,
        calendar: undefined,
      },
    })
    for (const permission of [
      'android.permission.READ_MEDIA_IMAGES',
      'android.permission.READ_CONTACTS',
      'android.permission.READ_CALENDAR',
      'android.permission.FOREGROUND_SERVICE',
    ]) {
      expect(bare.content).not.toContain(permission)
    }
    expect(bare.content).not.toContain('one.photoLibrary.addOnly')
    expect(bare.content).not.toContain('one.audio.background')
    expect(bare.content).not.toContain('OneAudioService')

    // reminders-only calendar needs no Android event permissions.
    const remindersOnly = renderPrebuildFile({
      relativePath: 'app/src/main/AndroidManifest.xml',
      content:
        '<manifest>\n    <uses-permission android:name="android.permission.INTERNET" />\n    <activity>\n      </activity>\n    </application>',
      platform: 'android',
      app: { ...app, calendar: { remindersUsage: 'Manage tasks' } },
    })
    expect(remindersOnly.content).not.toContain('android.permission.READ_CALENDAR')
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
}
class ReactNativeDelegate:${templateRnDelegate}`,
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

    const cliPath = join(
      root,
      'node_modules',
      '@react-native-community',
      'cli',
      'build',
      'bin.js'
    )
    mkdirSync(dirname(cliPath), { recursive: true })
    writeFileSync(
      cliPath,
      "if (process.argv[2] !== 'config') process.exit(1); console.log(JSON.stringify({root: process.cwd(), dependencies: {}}))"
    )

    const rendered = renderPrebuildFile({
      relativePath: 'settings.gradle',
      content: `pluginManagement { includeBuild("../node_modules/@react-native/gradle-plugin") }
includeBuild('../node_modules/@react-native/gradle-plugin')
extensions.configure(com.facebook.react.ReactSettingsExtension){ ex -> ex.autolinkLibrariesFromCommand() }`,
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
    const cliScript = [...(rendered.content ?? '').matchAll(/"--print", "([^"]+)"/g)]
      .map((match) => match[1])
      .find((script) => script.includes('@react-native-community/cli/build/bin.js'))
    if (!cliScript) throw new Error('expected installed CLI resolution script')
    const resolvedCli = execFileSync(process.execPath, ['--print', cliScript], {
      cwd: settingsDir,
      encoding: 'utf8',
    }).trim()
    const cliConfig = JSON.parse(
      execFileSync(process.execPath, [resolvedCli, 'config'], {
        cwd: root,
        encoding: 'utf8',
      })
    )
    expect(cliConfig).toEqual({ root: realpathSync(root), dependencies: {} })

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
class ReactNativeDelegate:${templateRnDelegate}`,
      platform: 'ios',
      app,
    })
    expect(rendered.content).toContain('@main')
    expect(rendered.content).toContain('class ReactNativeDelegate')
    expect(rendered.content).not.toContain('startReactNative')
    expect(rendered.content).not.toContain('UIWindow(frame:')
    expect(rendered.content).not.toContain('var window')
    expect(rendered.content).toContain('var reactNativeFactory')
    expect(rendered.content).toContain('override func customize(_ rootView: RCTRootView)')
    expect(rendered.content).toContain('OneHoldLaunchScreen(rootView)')
  })

  it('rejects a template that cannot request dev bytecode', () => {
    expect(() => renderPrebuildFile({
      relativePath: 'HelloWorld/AppDelegate.swift',
      content: `${templateAppDelegate}class ReactNativeDelegate:${templateRnDelegate.replace('forBundleRoot: "index"', 'forBundleRoot: "changed"')}`,
      platform: 'ios',
      app,
    })).toThrow('expected the template bundle URL provider')
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
    expect(sceneDelegate).toContain('appDelegate.reactNativeFactory')
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

  it('bundles native.app fonts into both platforms from the real template', async () => {
    const workspaceRoot = fileURLToPath(new URL('../../../..', import.meta.url))
    const output = mkdtempSync(join(tmpdir(), 'vxrn-prebuild-fonts-'))
    const fonts = ['tests/native-features/assets/OneNativeTestFont-BlockB.ttf']
    await generateForPlatform(workspaceRoot, 'ios', { ...app, fonts }, join(output, 'ios'))
    await generateForPlatform(workspaceRoot, 'android', { ...app, fonts }, join(output, 'android'))

    expect(existsSync(join(output, 'ios', 'MyApp', 'OneNativeTestFont-BlockB.ttf'))).toBe(true)
    const infoPlist = readFileSync(join(output, 'ios', 'MyApp', 'Info.plist'), 'utf8')
    expect(infoPlist).toContain(
      '<key>UIAppFonts</key>\n\t<array>\n\t\t<string>OneNativeTestFont-BlockB.ttf</string>'
    )
    const pbxproj = readFileSync(
      join(output, 'ios', 'MyApp.xcodeproj', 'project.pbxproj'),
      'utf8'
    )
    // file reference, group child, build file and resources phase entry.
    expect(pbxproj.split('/* OneNativeTestFont-BlockB.ttf */').length - 1).toBe(3)
    expect(pbxproj.split('/* OneNativeTestFont-BlockB.ttf in Resources */').length - 1).toBe(2)
    expect(pbxproj).toContain('path = MyApp/OneNativeTestFont-BlockB.ttf;')
    expect(
      existsSync(
        join(output, 'android', 'app', 'src', 'main', 'assets', 'fonts', 'OneNativeTestFont-BlockB.ttf')
      )
    ).toBe(true)
  })

  it('bundles firebase config files and applies the google-services plugin', async () => {
    const workspaceRoot = fileURLToPath(new URL('../../../..', import.meta.url))
    const output = mkdtempSync(join(tmpdir(), 'vxrn-prebuild-firebase-'))
    const plist = join(output, 'firebase-ios.plist')
    const json = join(output, 'firebase-android.json')
    writeFileSync(plist, '<plist><dict/></plist>\n')
    writeFileSync(json, '{}\n')
    const firebase = {
      ...app,
      ios: { ...app.ios, googleServicesFile: plist },
      android: { ...app.android, googleServicesFile: json },
    }
    await generateForPlatform(workspaceRoot, 'ios', firebase, join(output, 'ios'))
    await generateForPlatform(workspaceRoot, 'android', firebase, join(output, 'android'))

    expect(readFileSync(join(output, 'ios', 'MyApp', 'GoogleService-Info.plist'), 'utf8')).toBe(
      '<plist><dict/></plist>\n'
    )
    const pbxproj = readFileSync(
      join(output, 'ios', 'MyApp.xcodeproj', 'project.pbxproj'),
      'utf8'
    )
    expect(pbxproj).toContain(
      'lastKnownFileType = text.plist.xml; name = GoogleService-Info.plist; path = MyApp/GoogleService-Info.plist;'
    )
    expect(pbxproj.split('/* GoogleService-Info.plist in Resources */').length - 1).toBe(2)
    expect(readFileSync(join(output, 'android', 'app', 'google-services.json'), 'utf8')).toBe(
      '{}\n'
    )
    expect(readFileSync(join(output, 'android', 'build.gradle'), 'utf8')).toContain(
      'classpath("com.google.gms:google-services:4.4.4")'
    )
    expect(readFileSync(join(output, 'android', 'app', 'build.gradle'), 'utf8')).toContain(
      'apply plugin: "com.facebook.react"\napply plugin: "com.google.gms.google-services"'
    )
  })

  it('generates a scene project from the real template', async () => {
    const workspaceRoot = fileURLToPath(new URL('../../../..', import.meta.url))
    const output = mkdtempSync(join(tmpdir(), 'vxrn-prebuild-scene-'))
    await generateForPlatform(
      workspaceRoot,
      'ios',
      { ...app, orientation: 'default' },
      join(output, 'ios')
    )

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
    // orientation default opens the phone list to all four; ipad keeps its own.
    const phoneOrientations = infoPlist
      .split('<key>UISupportedInterfaceOrientations</key>')[1]
      .split('</array>')[0]
    for (const orientation of [
      'Portrait',
      'PortraitUpsideDown',
      'LandscapeLeft',
      'LandscapeRight',
    ]) {
      expect(phoneOrientations).toContain(
        `<string>UIInterfaceOrientation${orientation}</string>`
      )
    }
    expect(infoPlist).toContain('<key>UISupportedInterfaceOrientations~ipad</key>')

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
      ios: { ...app.ios, buildNumber: '4242', tablet: true, alternateIcons: {
        TestAlternate: {
          source: fileURLToPath(new URL('../../../../examples/one-basic/public/app-icon.png', import.meta.url)),
          backgroundColor: '#123456',
        },
      } },
      android: {
        ...app.android,
        versionCode: 4242,
        adaptiveIcon: {
          foreground: fileURLToPath(
            new URL('../../../../examples/one-basic/public/app-icon.png', import.meta.url)
          ),
          backgroundColor: '#123456',
        },
      },
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
    expect(generatedPbxproj.match(/ASSETCATALOG_COMPILER_ALTERNATE_APPICON_NAMES = "TestAlternate";/g))
      .toHaveLength(2)
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
    expect(iosContents.images).toHaveLength(18)
    expect(iosContents.images.every((image) => image.filename)).toBe(true)
    // a tablet build ships the iPad sizes App Store upload requires
    expect(await sharp(join(iosIconDir, 'icon-76@2x.png')).metadata())
      .toMatchObject({ width: 152, height: 152 })
    expect(await sharp(join(iosIconDir, 'icon-83.5@2x.png')).metadata())
      .toMatchObject({ width: 167, height: 167 })
    const iosMarketing = await sharp(join(iosIconDir, 'icon-1024.png')).metadata()
    expect(iosMarketing).toMatchObject({ width: 1024, height: 1024, hasAlpha: false })
    const alternateIconDir = join(output, 'ios', 'MyApp', 'Images.xcassets', 'TestAlternate.appiconset')
    const alternateContents: { images: Array<{ filename?: string }> } = JSON.parse(
      readFileSync(join(alternateIconDir, 'Contents.json'), 'utf8')
    )
    expect(alternateContents.images).toHaveLength(18)
    expect(alternateContents.images.every((image) => image.filename)).toBe(true)
    expect(await sharp(join(alternateIconDir, 'icon-1024.png')).metadata())
      .toMatchObject({ width: 1024, height: 1024, hasAlpha: false })

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
    // contained artwork is drawn at its launch width in points, at 1x to 3x
    for (const [filename, width] of [
      ['splash.png', 200],
      ['splash@2x.png', 400],
      ['splash@3x.png', 600],
    ] as const) {
      expect(
        await sharp(join(iosApp, 'Images.xcassets', 'Splash.imageset', filename)).metadata()
      ).toMatchObject({ width })
    }
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
    // the adaptive launcher icon: 108dp layers per density, a color background
    // in its own resource, and both launcher xmls wired to them
    expect(
      await sharp(join(androidRes, 'mipmap-xxxhdpi', 'ic_launcher_foreground.png')).metadata()
    ).toMatchObject({ width: 432, height: 432 })
    expect(() => statSync(join(androidRes, 'mipmap-mdpi', 'ic_launcher_background.png'))).toThrow()
    expect(readFileSync(join(androidRes, 'values', 'ic_launcher_background.xml'), 'utf8')).toContain(
      '<color name="ic_launcher_background">#123456</color>'
    )
    for (const filename of ['ic_launcher.xml', 'ic_launcher_round.xml']) {
      const adaptive = readFileSync(join(androidRes, 'mipmap-anydpi-v26', filename), 'utf8')
      expect(adaptive).toContain('<background android:drawable="@color/ic_launcher_background"/>')
      expect(adaptive).toContain('<foreground android:drawable="@mipmap/ic_launcher_foreground"/>')
      expect(adaptive).not.toContain('monochrome')
    }
    // android 12+ uses the configured splash image, never the launcher icon
    const stylesV31 = readFileSync(join(androidRes, 'values-v31', 'styles.xml'), 'utf8')
    expect(stylesV31).toContain('@color/splash_background')
    expect(stylesV31).toContain(
      'android:windowSplashScreenAnimatedIcon">@drawable/splash'
    )
    expect(stylesV31).not.toContain('ic_launcher')
  }, 180000)

  it('fills the ios launch screen with an untrimmed cover splash', async () => {
    const workspaceRoot = fileURLToPath(new URL('../../../..', import.meta.url))
    const output = mkdtempSync(join(tmpdir(), 'vxrn-prebuild-cover-'))
    const source = fileURLToPath(
      new URL('../../../../examples/one-basic/public/splash.png', import.meta.url)
    )
    await generateForPlatform(
      workspaceRoot,
      'ios',
      { ...app, splash: { source, backgroundColor: '#000000', resizeMode: 'cover' } },
      join(output, 'ios')
    )
    const iosApp = join(output, 'ios', 'MyApp')
    const { width, height } = await sharp(source).metadata()
    expect(
      await sharp(join(iosApp, 'Images.xcassets', 'Splash.imageset', 'splash.png')).metadata()
    ).toMatchObject({ width, height })
    const launchStoryboard = readFileSync(join(iosApp, 'LaunchScreen.storyboard'), 'utf8')
    expect(launchStoryboard).toContain('contentMode="scaleAspectFill" image="Splash"')
    for (const edge of ['leading', 'trailing', 'top', 'bottom']) {
      expect(launchStoryboard).toContain(`firstAttribute="${edge}" secondItem="launch-view"`)
    }
    expect(launchStoryboard).not.toContain('firstAttribute="width" constant')
  }, 180000)

  it('gives a dark launch its own background and artwork on both platforms', async () => {
    const workspaceRoot = fileURLToPath(new URL('../../../..', import.meta.url))
    const output = mkdtempSync(join(tmpdir(), 'vxrn-prebuild-dark-'))
    const source = fileURLToPath(
      new URL('../../../../examples/one-basic/public/splash.png', import.meta.url)
    )
    const splash = {
      source,
      backgroundColor: '#ffffff',
      dark: { source, backgroundColor: '#000000' },
    }
    await generateForPlatform(workspaceRoot, 'ios', { ...app, splash }, join(output, 'ios'))
    await generateForPlatform(workspaceRoot, 'android', { ...app, splash }, join(output, 'android'))

    const assets = join(output, 'ios', 'MyApp', 'Images.xcassets')
    const imageset = JSON.parse(
      readFileSync(join(assets, 'Splash.imageset', 'Contents.json'), 'utf8')
    )
    expect(imageset.images).toContainEqual({
      appearances: [{ appearance: 'luminosity', value: 'dark' }],
      filename: 'splash-dark@3x.png',
      idiom: 'universal',
      scale: '3x',
    })
    expect(existsSync(join(assets, 'Splash.imageset', 'splash-dark.png'))).toBe(true)
    const colorset = JSON.parse(
      readFileSync(join(assets, 'SplashBackground.colorset', 'Contents.json'), 'utf8')
    )
    expect(colorset.colors[0].color.components).toMatchObject({ red: '1.000' })
    expect(colorset.colors[1]).toMatchObject({
      appearances: [{ appearance: 'luminosity', value: 'dark' }],
      color: { components: { red: '0.000', green: '0.000', blue: '0.000' } },
    })
    const storyboard = readFileSync(
      join(output, 'ios', 'MyApp', 'LaunchScreen.storyboard'),
      'utf8'
    )
    expect(storyboard).toContain('<color key="backgroundColor" name="SplashBackground"/>')
    expect(storyboard).toContain('<namedColor name="SplashBackground">')

    const res = join(output, 'android', 'app', 'src', 'main', 'res')
    expect(readFileSync(join(res, 'values-night', 'colors.xml'), 'utf8')).toContain(
      '<color name="splash_background">#000000</color>'
    )
    expect(
      await sharp(join(res, 'drawable-night-xxxhdpi', 'splash.png')).metadata()
    ).toMatchObject({ width: 1152, height: 1152 })
  }, 180000)

  it('lays a full-bleed background image under the ios launch artwork', async () => {
    const workspaceRoot = fileURLToPath(new URL('../../../..', import.meta.url))
    const output = mkdtempSync(join(tmpdir(), 'vxrn-prebuild-splash-bg-'))
    const source = fileURLToPath(
      new URL('../../../../examples/one-basic/public/splash.png', import.meta.url)
    )
    const backgroundImage = join(output, 'ground.png')
    await sharp({
      create: { width: 30, height: 60, channels: 3, background: '#ececec' },
    })
      .png()
      .toFile(backgroundImage)
    const splash = {
      source,
      backgroundColor: '#ececec',
      width: 60,
      backgroundImage,
      dark: { backgroundColor: '#111111', backgroundImage },
    }
    await generateForPlatform(workspaceRoot, 'ios', { ...app, splash }, join(output, 'ios'))
    const assets = join(output, 'ios', 'MyApp', 'Images.xcassets')
    const background = JSON.parse(
      readFileSync(join(assets, 'SplashBackgroundImage.imageset', 'Contents.json'), 'utf8')
    )
    expect(background.images.map((image: { filename: string }) => image.filename)).toEqual([
      'splashbackgroundimage.png',
      'splashbackgroundimage-dark.png',
    ])
    const storyboard = readFileSync(
      join(output, 'ios', 'MyApp', 'LaunchScreen.storyboard'),
      'utf8'
    )
    // the background paints first, so the artwork sits above it
    expect(storyboard.indexOf('image="SplashBackgroundImage"')).toBeGreaterThan(-1)
    expect(storyboard.indexOf('image="SplashBackgroundImage"')).toBeLessThan(
      storyboard.indexOf('image="Splash"')
    )
    expect(storyboard).toContain('firstAttribute="top" secondItem="launch-view" secondAttribute="top" id="splash-background-top"')
    expect(storyboard).toContain('<image name="SplashBackgroundImage" width="30" height="60"/>')
    expect(storyboard).toContain('firstAttribute="width" constant="60"')
  }, 180000)

  it('writes the accent color asset and names it in the Info.plist', async () => {
    const workspaceRoot = fileURLToPath(new URL('../../../..', import.meta.url))
    const output = mkdtempSync(join(tmpdir(), 'vxrn-prebuild-accent-'))
    const accented = {
      ...app,
      ios: { ...app.ios, accentColor: { light: '#867286', dark: '#c8bfc8' } },
    }
    await generateForPlatform(workspaceRoot, 'ios', accented, join(output, 'ios'))
    const colorset = JSON.parse(
      readFileSync(
        join(output, 'ios', 'MyApp', 'Images.xcassets', 'AccentColor.colorset', 'Contents.json'),
        'utf8'
      )
    )
    expect(colorset.colors).toHaveLength(2)
    expect(colorset.colors[1].appearances).toEqual([{ appearance: 'luminosity', value: 'dark' }])
    const plist = readFileSync(join(output, 'ios', 'MyApp', 'Info.plist'), 'utf8')
    expect(plist).toContain('<key>NSAccentColorName</key>\n\t<string>AccentColor</string>')
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
    expect(mainActivity).toContain('import com.margelo.nitro.one.OneLaunchScreen')
    expect(mainActivity).toMatch(/super\.onCreate\(null\)\n.*\n\s*OneLaunchScreen\.hold\(this\)/)
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
      { ...widgetsApp, notifications: { push: true, apsEnvironment: 'production' } },
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
    expect(appEntitlements).toContain('<key>aps-environment</key>\n\t<string>production</string>')
    expect(appEntitlements).toContain('group.dev.one.myapp')
  }, 180000)
})

describe('app kotlin source discovery', () => {
  it('generates app sources without harvesting nested javascript packages', async () => {
    const root = mkdtempSync(join(tmpdir(), 'vxrn-prebuild-kotlin-'))
    const workspaceModules = fileURLToPath(
      new URL('../../../../node_modules', import.meta.url)
    )
    const { symlinkSync } = await import('node:fs')
    mkdirSync(join(root, 'node_modules', '@react-native-community'), { recursive: true })
    for (const name of ['cli', 'template']) {
      symlinkSync(
        join(workspaceModules, '@react-native-community', name),
        join(root, 'node_modules', '@react-native-community', name)
      )
    }
    writeFileSync(join(root, 'package.json'), '{"name":"app"}')
    const appDir = join(root, 'features', 'counter')
    const dependencyDir = join(root, 'packages', 'vendored')
    mkdirSync(appDir, { recursive: true })
    mkdirSync(join(dependencyDir, 'fixtures'), { recursive: true })
    const source = 'package app.counter\nclass Counter\n'
    writeFileSync(join(appDir, 'Counter.kt'), source)
    writeFileSync(join(dependencyDir, 'package.json'), '{"name":"vendored"}')
    writeFileSync(
      join(dependencyDir, 'fixtures', 'Browser.kt'),
      'package browser.fixture\nclass Browser\n'
    )
    await generateForPlatform(root, 'android', app)
    const generated = join(root, 'android', 'app', 'src', 'main', 'java', 'one', 'source')
    const ids = readdirSync(generated)
    expect(ids).toHaveLength(1)
    expect(readFileSync(join(generated, ids[0], 'Counter.kt'), 'utf8')).toBe(source)
  }, 180000)

  it('skips evidence directories holding preserved proof sources', async () => {
    const root = mkdtempSync(join(tmpdir(), 'vxrn-prebuild-kotlin-evidence-'))
    const dest = mkdtempSync(join(tmpdir(), 'vxrn-prebuild-kotlin-evidence-dest-'))
    const live = 'package app.counter\nclass Counter\n'
    writeFileSync(join(root, 'Counter.kt'), live)
    mkdirSync(join(root, 'proofs', 'evidence'), { recursive: true })
    const duplicate = 'class Preserved\n'
    writeFileSync(join(root, 'proofs', 'evidence', 'source-before-build.kt'), duplicate)
    writeFileSync(join(root, 'proofs', 'evidence', 'fault-source.kt'), duplicate)
    await generateKotlinSources({ root, dest })
    const generated = join(dest, 'app', 'src', 'main', 'java', 'one', 'source')
    const ids = readdirSync(generated)
    expect(ids).toHaveLength(1)
    expect(readFileSync(join(generated, ids[0], 'Counter.kt'), 'utf8')).toBe(live)
  })
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

  it('points every app target at the One bridging header', () => {
    const configs = `buildSettings = {
\t\t\t\tINFOPLIST_FILE = MyApp/Info.plist;
\t\t\t};
\t\t\tname = Debug;
buildSettings = {
\t\t\t\tINFOPLIST_FILE = MyApp/Info.plist;
\t\t\t};
\t\t\tname = Release;`
    const project = `shellScript = ${JSON.stringify('REACT_NATIVE_XCODE="$REACT_NATIVE_PATH/scripts/react-native-xcode.sh"\n/bin/sh -c "\\""$WITH_ENVIRONMENT\\"" \\""$REACT_NATIVE_XCODE\\"""\n')};\n${'/* AppDelegate.swift in Sources */ = {isa = PBXBuildFile;'}\n${'/* AppDelegate.swift */ = {isa = PBXFileReference;'}\n${'/* AppDelegate.swift */,'}\n${'/* AppDelegate.swift in Sources */,'}\n${configs}`
    const setting = 'SWIFT_OBJC_BRIDGING_HEADER = "MyApp/One-Bridging-Header.h";'
    // the launch screen hold needs the header with or without updates.
    for (const target of [app, updatesApp]) {
      const rendered = renderPrebuildFile({
        relativePath: 'MyApp.xcodeproj/project.pbxproj',
        content: project,
        platform: 'ios',
        app: target,
      })
      expect((rendered.content ?? '').split(setting).length - 1).toBe(2)
    }

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

  it('locks userInterfaceStyle on both platforms, and follows the system when unset', () => {
    const plist = (userInterfaceStyle?: 'light' | 'dark' | 'automatic') =>
      renderPrebuildFile({
        relativePath: 'HelloWorld/Info.plist',
        content: '<dict>\n\t<key>LSRequiresIPhoneOS</key>\n</dict>',
        platform: 'ios',
        app: { ...app, userInterfaceStyle },
      }).content
    expect(plist('light')).toContain('<key>UIUserInterfaceStyle</key>\n\t<string>Light</string>')
    expect(plist('dark')).toContain('<string>Dark</string>')
    expect(plist('automatic')).toContain('<string>Automatic</string>')
    expect(plist()).not.toContain('UIUserInterfaceStyle')

    const styles =
      '<resources>\n    <style name="AppTheme" parent="Theme.AppCompat.DayNight.NoActionBar">\n    </style>\n</resources>'
    const theme = (userInterfaceStyle?: 'light' | 'dark' | 'automatic') =>
      renderPrebuildFile({
        relativePath: 'app/src/main/res/values/styles.xml',
        content: styles,
        platform: 'android',
        app: { ...app, userInterfaceStyle },
      }).content
    expect(theme('light')).toContain('parent="Theme.AppCompat.Light.NoActionBar"')
    expect(theme('dark')).toContain('parent="Theme.AppCompat.NoActionBar"')
    expect(theme('automatic')).toContain('parent="Theme.AppCompat.DayNight.NoActionBar"')
    expect(theme()).toContain('parent="Theme.AppCompat.DayNight.NoActionBar"')
  })

  it('writes the app entitlements file for links, apple sign in and custom keys', async () => {
    const workspaceRoot = fileURLToPath(new URL('../../../..', import.meta.url))
    const output = mkdtempSync(join(tmpdir(), 'vxrn-prebuild-entitlements-'))
    const linked = {
      ...app,
      notifications: undefined,
      ios: {
        ...app.ios,
        associatedDomains: ['applinks:example.com'],
        usesAppleSignIn: true,
        entitlements: { 'com.apple.developer.icloud-container-identifiers': ['iCloud.dev.one'] },
      },
    }
    await generateForPlatform(workspaceRoot, 'ios', linked, join(output, 'ios'))
    const entitlements = readFileSync(join(output, 'ios', 'MyApp', 'MyApp.entitlements'), 'utf8')
    expect(entitlements).toContain(
      '<key>com.apple.developer.associated-domains</key>\n\t<array>\n\t\t<string>applinks:example.com</string>'
    )
    expect(entitlements).toContain('<key>com.apple.developer.applesignin</key>')
    expect(entitlements).toContain('<string>iCloud.dev.one</string>')
    expect(entitlements).not.toContain('aps-environment')
    const project = readFileSync(join(output, 'ios', 'MyApp.xcodeproj', 'project.pbxproj'), 'utf8')
    expect(project).toContain('CODE_SIGN_ENTITLEMENTS = MyApp/MyApp.entitlements;')

    await expect(
      generateForPlatform(
        workspaceRoot,
        'ios',
        { ...linked, ios: { ...linked.ios, entitlements: { 'com.apple.developer.applesignin': [] } } },
        join(output, 'ios-dup')
      )
    ).rejects.toThrow('native.app already writes')
  }, 180000)

  it('stamps extra Info.plist keys and rejects ones already written', () => {
    const plist = renderPrebuildFile({
      relativePath: 'HelloWorld/Info.plist',
      content: '<dict>\n\t<key>LSRequiresIPhoneOS</key>\n</dict>',
      platform: 'ios',
      app: {
        ...app,
        ios: {
          ...app.ios,
          infoPlist: {
            NSUserTrackingUsageDescription: 'Measure ads & installs',
            GADIsAdManagerApp: true,
            SKAdNetworkItems: [{ SKAdNetworkIdentifier: 'abc.skadnetwork' }],
          },
        },
      },
    }).content
    expect(plist).toContain(
      '<key>NSUserTrackingUsageDescription</key>\n\t<string>Measure ads &amp; installs</string>'
    )
    expect(plist).toContain('<key>GADIsAdManagerApp</key>\n\t<true/>')
    expect(plist).toContain(
      '<key>SKAdNetworkItems</key>\n\t<array>\n\t\t<dict>\n\t\t\t<key>SKAdNetworkIdentifier</key>'
    )
    expect(() =>
      renderPrebuildFile({
        relativePath: 'HelloWorld/Info.plist',
        content: '<dict>\n\t<key>LSRequiresIPhoneOS</key>\n</dict>',
        platform: 'ios',
        app: { ...app, ios: { ...app.ios, infoPlist: { CFBundleURLTypes: [] } } },
      })
    ).toThrow('already writes')
  })

  it('stamps android permissions, blocked permissions, app links and sdk levels', () => {
    const manifest = renderPrebuildFile({
      relativePath: 'app/src/main/AndroidManifest.xml',
      content:
        '<manifest xmlns:android="http://schemas.android.com/apk/res/android">\n    <uses-permission android:name="android.permission.INTERNET" />\n  <application>\n      <activity\n        android:name=".MainActivity">\n      </activity>\n    </application>\n</manifest>',
      platform: 'android',
      app: {
        ...app,
        notifications: undefined,
        imagePicker: undefined,
        speech: undefined,
        scheme: undefined,
        android: {
          ...app.android,
          permissions: ['VIBRATE', 'com.example.permission.CUSTOM'],
          blockedPermissions: ['RECORD_AUDIO'],
          appLinks: [{ host: 'example.com', pathPrefix: '/invite' }],
        },
      },
    }).content
    expect(manifest).toContain('<uses-permission android:name="android.permission.VIBRATE" />')
    expect(manifest).toContain('<uses-permission android:name="com.example.permission.CUSTOM" />')
    expect(manifest).toContain(
      '<uses-permission android:name="android.permission.RECORD_AUDIO" tools:node="remove" />'
    )
    expect(manifest).toContain('xmlns:tools="http://schemas.android.com/tools"')
    expect(manifest).toContain('<intent-filter android:autoVerify="true">')
    expect(manifest).toContain('<data android:host="example.com" android:pathPrefix="/invite" />')

    const gradle = renderPrebuildFile({
      relativePath: 'build.gradle',
      content: 'minSdkVersion = 24\ncompileSdkVersion = 37\ntargetSdkVersion = 36',
      platform: 'android',
      app: { ...app, android: { ...app.android, targetSdk: 35, compileSdk: 36 } },
    }).content
    expect(gradle).toBe('minSdkVersion = 28\ncompileSdkVersion = 36\ntargetSdkVersion = 35')
  })

  it('turns on release minify, resource shrinking and extra proguard rules', () => {
    const android = {
      ...app.android,
      minify: true,
      shrinkResources: true,
      proguardRules: '-keep class com.example.** { *; }',
    }
    const gradle = renderPrebuildFile({
      relativePath: 'app/build.gradle',
      content:
        'react {\n    autolinkLibrariesWithApp()\n}\ndef enableProguardInReleaseBuilds = false\n        release {\n            minifyEnabled enableProguardInReleaseBuilds\n        }',
      platform: 'android',
      app: { ...app, android },
    }).content
    expect(gradle).toContain('def enableProguardInReleaseBuilds = true')
    expect(gradle).toContain(
      'minifyEnabled enableProguardInReleaseBuilds\n            shrinkResources true'
    )
    const rules = renderPrebuildFile({
      relativePath: 'app/proguard-rules.pro',
      content: '# Add project specific ProGuard rules here.\n',
      platform: 'android',
      app: { ...app, android },
    }).content
    expect(rules).toBe(
      '# Add project specific ProGuard rules here.\n\n-keep class com.example.** { *; }\n'
    )
    expect(() =>
      renderPrebuildFile({
        relativePath: 'app/build.gradle',
        content: 'react {\n    autolinkLibrariesWithApp()\n}\nno switch',
        platform: 'android',
        app: { ...app, android },
      })
    ).toThrow('proguard switch')
  })

  it('stamps orientation as expo does, and nothing when unset', () => {
    const plistTemplate =
      '<dict>\n\t<key>LSRequiresIPhoneOS</key>\n\t<key>UISupportedInterfaceOrientations</key>\n\t<array>\n\t\t<string>UIInterfaceOrientationPortrait</string>\n\t</array>\n</dict>'
    const landscape = renderPrebuildFile({
      relativePath: 'HelloWorld/Info.plist',
      content: plistTemplate,
      platform: 'ios',
      app: { ...app, orientation: 'landscape' },
    })
    expect(landscape.content).toContain(
      '<array>\n\t\t<string>UIInterfaceOrientationLandscapeLeft</string>\n\t\t<string>UIInterfaceOrientationLandscapeRight</string>\n\t</array>'
    )
    expect(landscape.content).not.toContain('UIInterfaceOrientationPortrait<')
    const unset = renderPrebuildFile({
      relativePath: 'HelloWorld/Info.plist',
      content: plistTemplate,
      platform: 'ios',
      app,
    })
    expect(unset.content).toContain('<string>UIInterfaceOrientationPortrait</string>')
    expect(unset.content).not.toContain('PortraitUpsideDown')

    const manifestTemplate =
      '<manifest>\n  <uses-permission android:name="android.permission.INTERNET" />\n  <application>\n      <activity\n        android:name=".MainActivity"\n        android:exported="true">\n      </activity>\n    </application>\n</manifest>'
    for (const [orientation, attribute] of [
      ['portrait', 'portrait'],
      ['landscape', 'landscape'],
      ['default', 'unspecified'],
    ] as const) {
      const rendered = renderPrebuildFile({
        relativePath: 'app/src/main/AndroidManifest.xml',
        content: manifestTemplate,
        platform: 'android',
        app: {
          ...app,
          notifications: undefined,
          imagePicker: undefined,
          speech: undefined,
          orientation,
        },
      })
      expect(rendered.content).toContain(`android:screenOrientation="${attribute}"`)
    }
    expect(() =>
      validatePrebuildApp({ ...app, orientation: 'sideways' as 'default' })
    ).toThrow('orientation "sideways"')
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
      '<meta-data android:name="dev.onejs.updates.runtimeVersion" android:value="@string/one_updates_runtime_version" />'
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

describe('kotlin compose app integration', () => {
  it('enables compose plugin, buildFeatures, and dependencies in gradle files', () => {
    const dest = mkdtempSync(join(tmpdir(), 'vxrn-compose-gradle-'))
    const rootGradle = join(dest, 'build.gradle')
    const appDir = join(dest, 'app')
    const appGradle = join(appDir, 'build.gradle')
    mkdirSync(appDir, { recursive: true })

    writeFileSync(
      rootGradle,
      `buildscript {
    dependencies {
        classpath("com.android.tools.build:gradle")
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin")
    }
}
`
    )
    writeFileSync(
      appGradle,
      `apply plugin: "com.android.application"
apply plugin: "org.jetbrains.kotlin.android"
apply plugin: "com.facebook.react"

android {
    namespace "com.example.app"
}

dependencies {
    implementation("com.facebook.react:react-android")
}
`
    )

    enableAppComposeIntegration(dest)

    const updatedRoot = readFileSync(rootGradle, 'utf8')
    expect(updatedRoot).toContain('org.jetbrains.kotlin.plugin.compose.gradle.plugin')

    const updatedApp = readFileSync(appGradle, 'utf8')
    expect(updatedApp).toContain('apply plugin: "org.jetbrains.kotlin.plugin.compose"')
    expect(updatedApp).toContain('buildFeatures {\n        compose true\n    }')
    expect(updatedApp).toContain('androidx.compose.ui:ui:$composeUiVersion')
    expect(updatedApp).toContain('androidx.compose.foundation:foundation:$composeUiVersion')
    expect(updatedApp).toContain('androidx.compose.material3:material3:$material3Version')
  })

  it('enables compose only when .kt has views, keeping module-only prebuild unchanged', async () => {
    const root = mkdtempSync(join(tmpdir(), 'vxrn-compose-views-root-'))
    const dest = mkdtempSync(join(tmpdir(), 'vxrn-compose-views-dest-'))
    const rootGradle = join(dest, 'build.gradle')
    const appDir = join(dest, 'app')
    const appGradle = join(appDir, 'build.gradle')
    mkdirSync(appDir, { recursive: true })

    const initialRootGradle = `buildscript {
    dependencies {
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin")
    }
}
`
    const initialAppGradle = `apply plugin: "org.jetbrains.kotlin.android"
android {
    namespace "com.example"
}
dependencies {
    implementation("com.facebook.react:react-android")
}
`
    writeFileSync(rootGradle, initialRootGradle)
    writeFileSync(appGradle, initialAppGradle)

    // 1. Module-only source: prebuild must leave gradle unchanged
    writeFileSync(
      join(root, 'MathModule.kt'),
      `package com.example
object MathModule : dev.onejs.one.source.OneModule {
  fun add(a: Int, b: Int): Int = a + b
}
`
    )

    await generateKotlinSources({ root, dest })

    expect(readFileSync(rootGradle, 'utf8')).toBe(initialRootGradle)
    expect(readFileSync(appGradle, 'utf8')).toBe(initialAppGradle)

    // 2. Add a composable view source: prebuild must enable Compose
    writeFileSync(
      join(root, 'Counter.kt'),
      `package com.example
import androidx.compose.runtime.Composable

@Composable
fun Counter(label: String, onIncrement: () -> Unit) {
}
`
    )

    await generateKotlinSources({ root, dest })

    const updatedRoot = readFileSync(rootGradle, 'utf8')
    const updatedApp = readFileSync(appGradle, 'utf8')
    expect(updatedRoot).toContain('org.jetbrains.kotlin.plugin.compose')
    expect(updatedApp).toContain('apply plugin: "org.jetbrains.kotlin.plugin.compose"')
    expect(updatedApp).toContain('compose true')
    expect(updatedApp).toContain('androidx.compose.ui:ui')
  })
})
