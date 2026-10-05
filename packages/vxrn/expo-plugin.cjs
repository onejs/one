const fs = require('node:fs')
const { createRequire } = require('node:module')
const path = require('node:path')
const nativeProjectPatches = require('./native-project-patches.cjs')

// options: { notifications: { push?: boolean, mode?: 'development' | 'production' } }
// turns on One.Notifications the way native.app.notifications does for one
// prebuild. mode is the aps-environment, as expo-notifications takes it.
//
// options: { updates: { url?: string, runtimeVersion: string } } turns on
// One.Updates on iOS the way native.app.updates does for one prebuild: the
// release bundleURL asks the launcher, and the bundle phase writes the
// embedded manifest. Expo's Android host builds its own ReactHost delegate,
// which One.Updates cannot re-point, so Android needs one prebuild.
//
// options: { holdLaunchScreen: true } keeps the launch storyboard over the
// react native root until its first content, and MainActivity's content
// from drawing until then on Android, as one prebuild always does. leave it
// off while expo-splash-screen owns the splash.
// options: { location: { whenInUse: string, background?: boolean } } sets the ios
// location prompt and optional background mode.
// options: { audio: { microphone?: string, background?: boolean } } sets the
// ios recording prompt and background audio mode.
// options: { photoLibrary: { addOnly?: string, readWrite?: string } } sets ios photos prompts.
// options: { contacts: { usage: string } } sets the ios contacts prompt.
// options: { calendar: { usage?: string, remindersUsage?: string } } sets EventKit prompts.
module.exports = function withVxrn(config, options = {}) {
  const projectRoot = config?._internal?.projectRoot
  if (!projectRoot) {
    throw new Error('[vxrn/expo-plugin] Expo config is missing _internal.projectRoot')
  }

  const projectRequire = createRequire(path.join(projectRoot, 'package.json'))
  const {
    AndroidConfig,
    withAndroidManifest,
    withAppBuildGradle,
    withAppDelegate,
    withDangerousMod,
    withEntitlementsPlist,
    withGradleProperties,
    withInfoPlist,
    withMainActivity,
    withMainApplication,
    withPlugins,
    withXcodeProject,
  } = projectRequire('@expo/config-plugins')

  const notifications = options.notifications
  const location = options.location
  const audio = options.audio
  const photoLibrary = options.photoLibrary
  const contacts = options.contacts
  const calendar = options.calendar
  if (
    location &&
    (typeof location.whenInUse !== 'string' || !location.whenInUse.trim())
  ) {
    throw new Error('[vxrn/expo-plugin] location.whenInUse must be a non-empty string')
  }
  if (location?.background !== undefined && typeof location.background !== 'boolean') {
    throw new Error('[vxrn/expo-plugin] location.background must be a boolean')
  }
  if (audio !== undefined) {
    if (!audio || typeof audio !== 'object') {
      throw new Error('[vxrn/expo-plugin] audio must configure microphone or background playback')
    }
    if (audio.microphone !== undefined &&
      (typeof audio.microphone !== 'string' || !audio.microphone.trim())) {
      throw new Error('[vxrn/expo-plugin] audio.microphone must be a non-empty string')
    }
    if (audio.background !== undefined && typeof audio.background !== 'boolean') {
      throw new Error('[vxrn/expo-plugin] audio.background must be a boolean')
    }
    if (audio.microphone === undefined && audio.background !== true) {
      throw new Error('[vxrn/expo-plugin] audio must configure microphone or background playback')
    }
  }
  if (
    photoLibrary !== undefined &&
    (!photoLibrary ||
      (photoLibrary.addOnly === undefined && photoLibrary.readWrite === undefined))
  ) {
    throw new Error('[vxrn/expo-plugin] photoLibrary must configure addOnly or readWrite')
  }
  if (photoLibrary?.addOnly !== undefined &&
    (typeof photoLibrary.addOnly !== 'string' || !photoLibrary.addOnly.trim())) {
    throw new Error('[vxrn/expo-plugin] photoLibrary.addOnly must be a non-empty string')
  }
  if (photoLibrary?.readWrite !== undefined &&
    (typeof photoLibrary.readWrite !== 'string' || !photoLibrary.readWrite.trim())) {
    throw new Error('[vxrn/expo-plugin] photoLibrary.readWrite must be a non-empty string')
  }
  if (
    contacts !== undefined &&
    (!contacts || typeof contacts.usage !== 'string' || !contacts.usage.trim())
  ) {
    throw new Error('[vxrn/expo-plugin] contacts.usage must be a non-empty string')
  }
  if (calendar !== undefined) {
    if (!calendar || (calendar.usage === undefined && calendar.remindersUsage === undefined)) {
      throw new Error('[vxrn/expo-plugin] calendar.usage or calendar.remindersUsage is required')
    }
    if (calendar.usage !== undefined &&
      (typeof calendar.usage !== 'string' || !calendar.usage.trim())) {
      throw new Error('[vxrn/expo-plugin] calendar.usage must be a non-empty string')
    }
    if (calendar.remindersUsage !== undefined &&
      (typeof calendar.remindersUsage !== 'string' || !calendar.remindersUsage.trim())) {
      throw new Error('[vxrn/expo-plugin] calendar.remindersUsage must be a non-empty string')
    }
  }
  const locationPlugins = !location
    ? []
    : [
        [
          withInfoPlist,
          (nextConfig) => {
            nextConfig.modResults.NSLocationWhenInUseUsageDescription = location.whenInUse
            if (location.background === true) {
              const modes = nextConfig.modResults.UIBackgroundModes || []
              nextConfig.modResults.UIBackgroundModes = [...new Set([...modes, 'location'])]
            }
            return nextConfig
          },
        ],
      ]
  const audioPlugins = !audio
    ? []
    : [
        [
          withInfoPlist,
          (nextConfig) => {
            if (audio.microphone !== undefined) {
              nextConfig.modResults.NSMicrophoneUsageDescription = audio.microphone
            }
            if (audio.background === true) {
              const modes = nextConfig.modResults.UIBackgroundModes || []
              nextConfig.modResults.UIBackgroundModes = [...new Set([...modes, 'audio'])]
            }
            return nextConfig
          },
        ],
      ]
  const photoLibraryPlugins = !photoLibrary
    ? []
    : [
        [
          withInfoPlist,
          (nextConfig) => {
            if (photoLibrary.addOnly !== undefined)
              nextConfig.modResults.NSPhotoLibraryAddUsageDescription = photoLibrary.addOnly
            if (photoLibrary.readWrite !== undefined) {
              nextConfig.modResults.NSPhotoLibraryUsageDescription = photoLibrary.readWrite
              nextConfig.modResults.PHPhotoLibraryPreventAutomaticLimitedAccessAlert = true
            }
            return nextConfig
          },
        ],
      ]
  const contactsPlugins = !contacts
    ? []
    : [
        [
          withInfoPlist,
          (nextConfig) => {
            nextConfig.modResults.NSContactsUsageDescription = contacts.usage
            return nextConfig
          },
        ],
      ]
  const calendarPlugins = !calendar
    ? []
    : [
        [
          withInfoPlist,
          (nextConfig) => {
            if (calendar.usage) {
              nextConfig.modResults.NSCalendarsFullAccessUsageDescription = calendar.usage
            }
            if (calendar.remindersUsage) {
              nextConfig.modResults.NSRemindersFullAccessUsageDescription = calendar.remindersUsage
            }
            return nextConfig
          },
        ],
      ]
  // mirrors one prebuild's Android media stamps: the same permissions,
  // meta-data markers and audio service from the same option fields.
  const mediaPlugins =
    audio === undefined &&
    photoLibrary === undefined &&
    contacts === undefined &&
    calendar === undefined
      ? []
      : [
          [
            withAndroidManifest,
            (nextConfig) => {
              const manifest = nextConfig.modResults.manifest
              manifest['uses-permission'] ??= []
              const ensurePermission = (name, maxSdkVersion) => {
                if (
                  manifest['uses-permission'].some((p) => p.$['android:name'] === name)
                )
                  return
                manifest['uses-permission'].push({
                  $: {
                    'android:name': name,
                    ...(maxSdkVersion === undefined
                      ? {}
                      : { 'android:maxSdkVersion': String(maxSdkVersion) }),
                  },
                })
              }
              if (audio?.microphone !== undefined)
                ensurePermission('android.permission.RECORD_AUDIO')
              if (photoLibrary?.readWrite !== undefined) {
                ensurePermission('android.permission.READ_MEDIA_IMAGES')
                ensurePermission('android.permission.READ_MEDIA_VIDEO')
                ensurePermission('android.permission.READ_EXTERNAL_STORAGE', 32)
              }
              if (photoLibrary?.addOnly !== undefined)
                ensurePermission('android.permission.WRITE_EXTERNAL_STORAGE', 28)
              if (contacts !== undefined) {
                ensurePermission('android.permission.READ_CONTACTS')
                ensurePermission('android.permission.WRITE_CONTACTS')
              }
              if (calendar?.usage !== undefined) {
                ensurePermission('android.permission.READ_CALENDAR')
                ensurePermission('android.permission.WRITE_CALENDAR')
              }
              if (audio?.background === true) {
                ensurePermission('android.permission.FOREGROUND_SERVICE')
                ensurePermission('android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK')
              }
              const application =
                AndroidConfig.Manifest.getMainApplicationOrThrow(nextConfig.modResults)
              const ensureMetaData = (name) => {
                application['meta-data'] = (application['meta-data'] ?? []).filter(
                  (entry) => entry.$['android:name'] !== name
                )
                application['meta-data'].push({
                  $: { 'android:name': name, 'android:value': 'true' },
                })
              }
              if (photoLibrary?.addOnly !== undefined)
                ensureMetaData('one.photoLibrary.addOnly')
              if (audio?.background === true) {
                ensureMetaData('one.audio.background')
                const serviceName = 'com.margelo.nitro.one.OneAudioService'
                application['service'] = (application['service'] ?? []).filter(
                  (entry) => entry.$['android:name'] !== serviceName
                )
                application['service'].push({
                  $: {
                    'android:name': serviceName,
                    'android:exported': 'false',
                    'android:foregroundServiceType': 'mediaPlayback',
                  },
                })
              }
              return nextConfig
            },
          ],
        ]
  const host = nativeProjectPatches.ONE_NOTIFICATIONS
  const notificationPlugins = !notifications
    ? []
    : [
        [
          withInfoPlist,
          (nextConfig) => {
            nextConfig.modResults[host.enabledInfoPlistKey] = true
            if (notifications.push) nextConfig.modResults[host.pushInfoPlistKey] = true
            return nextConfig
          },
        ],
        [
          withEntitlementsPlist,
          (nextConfig) => {
            if (notifications.push) {
              nextConfig.modResults['aps-environment'] =
                notifications.mode || host.apsEnvironment
            }
            return nextConfig
          },
        ],
        [
          withAndroidManifest,
          (nextConfig) => {
            const manifest = nextConfig.modResults.manifest
            manifest['uses-permission'] ??= []
            for (const name of host.androidPermissions) {
              if (!manifest['uses-permission'].some((p) => p.$['android:name'] === name)) {
                manifest['uses-permission'].push({ $: { 'android:name': name } })
              }
            }
            const application =
              AndroidConfig.Manifest.getMainApplicationOrThrow(nextConfig.modResults)
            const component = (kind, name, action) => {
              application[kind] = (application[kind] ?? []).filter(
                (entry) => entry.$['android:name'] !== name
              )
              application[kind].push({
                $: { 'android:name': name, 'android:exported': 'false' },
                'intent-filter': [{ action: [{ $: { 'android:name': action } }] }],
              })
            }
            component('receiver', host.receiver, host.receiverAction)
            if (notifications.push) {
              component('service', host.pushService, host.pushServiceAction)
            }
            return nextConfig
          },
        ],
        [
          withGradleProperties,
          (nextConfig) => {
            if (!notifications.push) return nextConfig
            const properties = nextConfig.modResults.filter(
              (item) => !(item.type === 'property' && item.key === host.pushGradleProperty)
            )
            properties.push({ type: 'property', key: host.pushGradleProperty, value: 'true' })
            nextConfig.modResults = properties
            return nextConfig
          },
        ],
      ]

  // appends one import to the app's bridging header, which is how the app
  // target reaches One's c entry points: it cannot import the One module.
  const importIntoBridgingHeader = (option, importLine) => [
    withDangerousMod,
    [
      'ios',
      (nextConfig) => {
        const { platformProjectRoot, projectName } = nextConfig.modRequest
        const header = path.join(
          platformProjectRoot,
          projectName,
          `${projectName}-Bridging-Header.h`
        )
        if (!fs.existsSync(header)) {
          throw new Error(
            `[vxrn/expo-plugin] ${option}: expected the app's bridging header at ${header}`
          )
        }
        const contents = fs.readFileSync(header, 'utf8')
        if (!contents.includes(importLine)) {
          fs.writeFileSync(header, `${contents.trimEnd()}\n${importLine}\n`)
        }
        return nextConfig
      },
    ],
  ]

  const updates = options.updates
  if (updates && (typeof updates.runtimeVersion !== 'string' || !updates.runtimeVersion)) {
    throw new Error('[vxrn/expo-plugin] updates.runtimeVersion must be a non-empty string')
  }
  const updatesHost = nativeProjectPatches.ONE_UPDATES
  const updatesPlugins = !updates
    ? []
    : [
        [
          withInfoPlist,
          (nextConfig) => {
            // without the url the embedded bundle launches with updates
            // disabled, as in one prebuild.
            if (updates.url !== undefined) {
              nextConfig.modResults[updatesHost.urlInfoPlistKey] = updates.url
            }
            nextConfig.modResults[updatesHost.runtimeVersionInfoPlistKey] =
              updates.runtimeVersion
            return nextConfig
          },
        ],
        [
          withAppDelegate,
          (nextConfig) => {
            nextConfig.modResults.contents =
              nativeProjectPatches.pointReleaseBundleURLAtOneUpdates(
                nextConfig.modResults.contents
              )
            return nextConfig
          },
        ],
        importIntoBridgingHeader('updates', updatesHost.bridgingHeaderImport),
        [
          withMainActivity,
          () => {
            throw new Error(
              '[vxrn/expo-plugin] updates: One.Updates on Android needs one prebuild; Expo prebuild supports it on iOS only'
            )
          },
        ],
      ]

  const launchScreenPlugins = !options.holdLaunchScreen
    ? []
    : [
        [
          withAppDelegate,
          (nextConfig) => {
            nextConfig.modResults.contents =
              nativeProjectPatches.holdLaunchScreenOverRootView(
                nextConfig.modResults.contents
              )
            return nextConfig
          },
        ],
        importIntoBridgingHeader(
          'holdLaunchScreen',
          nativeProjectPatches.ONE_LAUNCH_SCREEN.bridgingHeaderImport
        ),
      ]

  return withPlugins(config, [
    ...locationPlugins,
    ...audioPlugins,
    ...photoLibraryPlugins,
    ...contactsPlugins,
    ...calendarPlugins,
    ...mediaPlugins,
    ...notificationPlugins,
    ...updatesPlugins,
    ...launchScreenPlugins,
    [
      withXcodeProject,
      (nextConfig) => {
        const phase = nextConfig.modResults.buildPhaseObject(
          'PBXShellScriptBuildPhase',
          'Bundle React Native code and images'
        )
        if (!phase) return nextConfig

        let script = JSON.parse(phase.shellScript)
        script =
          nativeProjectPatches.removeExpoDefaultsFromBundleReactNativeShellScript(script)
        script = nativeProjectPatches.addSetCliPathToBundleReactNativeShellScript(script)
        script = nativeProjectPatches.addPodHermescToBundleReactNativeShellScript(script)
        script = nativeProjectPatches.addDepsPatchToBundleReactNativeShellScript(script)
        if (updates) {
          script = nativeProjectPatches.addEmbeddedUpdatesManifestToBundleReactNativeShellScript(
            script,
            updates.runtimeVersion
          )
        }
        phase.shellScript = JSON.stringify(script)
        return nextConfig
      },
    ],
    [
      withAppBuildGradle,
      (nextConfig) => {
        let contents = nativeProjectPatches.replaceAppBuildGradleReactBlock(
          nextConfig.modResults.contents
        )
        contents = nativeProjectPatches.addDepsPatchToAppBuildGradle(contents)
        nextConfig.modResults.contents = contents
        return nextConfig
      },
    ],
    [
      withMainApplication,
      (nextConfig) => {
        const anchor = 'context = applicationContext,'
        const contents = nextConfig.modResults.contents
        if (!contents.includes('ExpoReactHostFactory.getDefaultReactHost(') || !contents.includes(anchor)) {
          throw new Error('[vxrn/expo-plugin] expected ExpoReactHostFactory in MainApplication')
        }
        const configured = `${anchor}\n      jsMainModulePath = "index",\n      useDevSupport = BuildConfig.DEBUG,`
        // the prebuilt react library has DEBUG=false. use the application build
        // flag and One's entry instead of Expo's virtual Metro entry.
        nextConfig.modResults.contents = contents.includes(configured)
          ? contents
          : contents.replace(anchor, configured)
        return nextConfig
      },
    ],
    [
      withMainActivity,
      (nextConfig) => {
        const contents = nativeProjectPatches.addReactNativeScreensFix(
          nextConfig.modResults.contents
        )
        nextConfig.modResults.contents = options.holdLaunchScreen
          ? nativeProjectPatches.holdLaunchScreenInMainActivity(contents)
          : contents
        return nextConfig
      },
    ],
    [
      withDangerousMod,
      [
        'ios',
        (nextConfig) => {
          const podfilePath = path.join(
            nextConfig.modRequest.platformProjectRoot,
            'Podfile'
          )
          if (!fs.existsSync(podfilePath)) return nextConfig

          let podfile = fs.readFileSync(podfilePath, 'utf8')
          podfile = nativeProjectPatches.injectFmtCxx17FixIntoPodfile(podfile)
          podfile = nativeProjectPatches.injectHermesMinificationPatchIntoPodfile(podfile)
          podfile = nativeProjectPatches.injectReactNativeScreensGammaIntoPodfile(podfile)
          if (nativeProjectPatches.hasNitroWebImage(projectRoot)) {
            podfile = nativeProjectPatches.injectNitroWebImageModularHeaderIntoPodfile(podfile)
          }
          fs.writeFileSync(podfilePath, podfile, 'utf8')
          return nextConfig
        },
      ],
    ],
  ])
}
