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
    withPlugins,
    withXcodeProject,
  } = projectRequire('@expo/config-plugins')

  const notifications = options.notifications
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
        [
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
                  `[vxrn/expo-plugin] updates: expected the app's bridging header at ${header}`
                )
              }
              const contents = fs.readFileSync(header, 'utf8')
              if (!contents.includes(updatesHost.bridgingHeaderImport)) {
                fs.writeFileSync(
                  header,
                  `${contents.trimEnd()}\n${updatesHost.bridgingHeaderImport}\n`
                )
              }
              return nextConfig
            },
          ],
        ],
        [
          withMainActivity,
          () => {
            throw new Error(
              '[vxrn/expo-plugin] updates: One.Updates on Android needs one prebuild; Expo prebuild supports it on iOS only'
            )
          },
        ],
      ]

  return withPlugins(config, [
    ...notificationPlugins,
    ...updatesPlugins,
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
      withMainActivity,
      (nextConfig) => {
        nextConfig.modResults.contents = nativeProjectPatches.addReactNativeScreensFix(
          nextConfig.modResults.contents
        )
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
