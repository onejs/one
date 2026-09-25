const fs = require('node:fs')
const { createRequire } = require('node:module')
const path = require('node:path')
const nativeProjectPatches = require('./native-project-patches.cjs')

// options: { notifications: { push?: boolean, mode?: 'development' | 'production' } }
// turns on One.Notifications the way native.app.notifications does for one
// prebuild. mode is the aps-environment, as expo-notifications takes it.
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

  return withPlugins(config, [
    ...notificationPlugins,
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
