const fs = require('node:fs')
const { createRequire } = require('node:module')
const path = require('node:path')
const nativeProjectPatches = require('./native-project-patches.cjs')

module.exports = function withVxrn(config) {
  const projectRoot = config?._internal?.projectRoot
  if (!projectRoot) {
    throw new Error('[vxrn/expo-plugin] Expo config is missing _internal.projectRoot')
  }

  const projectRequire = createRequire(path.join(projectRoot, 'package.json'))
  const {
    withAppBuildGradle,
    withDangerousMod,
    withMainActivity,
    withPlugins,
    withXcodeProject,
  } = projectRequire('@expo/config-plugins')

  return withPlugins(config, [
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
