import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import withVxrn from '../../expo-plugin.cjs'

const require = createRequire(import.meta.url)
const patches = require('../../native-project-patches.cjs')
const temporaryDirectories = []

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
})

const expoBundlePhase = [
  'if [[ -z "$CLI_PATH" ]]; then',
  '  export CLI_PATH="expo-cli"',
  'fi',
  'if [[ -z "$BUNDLE_COMMAND" ]]; then',
  '  export BUNDLE_COMMAND="export:embed"',
  'fi',
  '"`"$NODE_BINARY" --print "require(\'path\').dirname(require.resolve(\'react-native/package.json\')) + \'/scripts/react-native-xcode.sh\'"`"',
].join('\n')

const podfile = `
target 'TestApp' do
  config = use_native_modules!
  post_install do |installer|
    react_native_post_install(installer)
  end
end
`

describe('vxrn Expo project patches', () => {
  it('replaces Expo bundle defaults with One bundle configuration', () => {
    let result =
      patches.removeExpoDefaultsFromBundleReactNativeShellScript(expoBundlePhase)
    result = patches.addSetCliPathToBundleReactNativeShellScript(result)
    result = patches.addPodHermescToBundleReactNativeShellScript(result)
    result = patches.addDepsPatchToBundleReactNativeShellScript(result)

    expect(result).not.toContain('export:embed')
    expect(result).toContain('[vxrn/one] React Native now defaults CLI_PATH')
    expect(result).toContain('[vxrn/one] use the hermes-engine pod')
    expect(result).toContain('[vxrn/one] ensure patches are applied')
    expect(result.indexOf('export CLI_PATH=')).toBeLessThan(
      result.indexOf('react-native-xcode.sh')
    )
  })

  it('replaces the Expo Android react block and applies build patches', () => {
    const input = `react {\n    entryFile = file("../index.js")\n}\n`
    let result = patches.replaceAppBuildGradleReactBlock(input)
    result = patches.addDepsPatchToAppBuildGradle(result)

    expect(result).toContain('cliFile = new File(')
    expect(result).toContain('autolinkLibrariesWithApp()')
    expect(result).not.toContain('entryFile = file("../index.js")')
    expect(result).toContain('[vxrn/one] ensure patches are applied')
  })

  it('applies the shared Podfile patches idempotently', () => {
    let once = patches.injectFmtCxx17FixIntoPodfile(podfile)
    once = patches.injectHermesMinificationPatchIntoPodfile(once)
    once = patches.injectReactNativeScreensGammaIntoPodfile(once)
    once = patches.injectNitroWebImageModularHeaderIntoPodfile(once)
    let twice = patches.injectFmtCxx17FixIntoPodfile(once)
    twice = patches.injectHermesMinificationPatchIntoPodfile(twice)
    twice = patches.injectReactNativeScreensGammaIntoPodfile(twice)
    twice = patches.injectNitroWebImageModularHeaderIntoPodfile(twice)

    expect(twice).toBe(once)
    expect(once).toContain('[vxrn/one] fmt c++17 fix')
    expect(once).toContain('[vxrn/one] minify iOS Hermes Release bundle input')
    expect(once).toContain("ENV['RNS_GAMMA_ENABLED'] ||= '1'")
    expect(once).toContain("pod 'SDWebImage', :modular_headers => true")
  })

  it('applies the shared Android screens fix', () => {
    const result = patches.addReactNativeScreensFix(`
package dev.one.test
import com.facebook.react.ReactActivity
class MainActivity : ReactActivity() {
}
`)

    expect(result).toContain('RNScreensFragmentFactory')
    expect(result).toContain('super.onCreate(null)')
  })
})

describe('vxrn/expo-plugin', () => {
  it('resolves Expo config plugins from the app and binds the dangerous mod', async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'vxrn-expo-plugin-'))
    temporaryDirectories.push(projectRoot)
    const iosRoot = join(projectRoot, 'ios')
    mkdirSync(iosRoot, { recursive: true })
    writeFileSync(join(iosRoot, 'Podfile'), podfile)
    writeFileSync(join(projectRoot, 'package.json'), '{"private":true}')
    const workspaceRequire = createRequire(import.meta.url)
    const configPluginsRoot = workspaceRequire.resolve(
      '@expo/config-plugins/package.json'
    )
    const scopedDirectory = join(projectRoot, 'node_modules', '@expo')
    mkdirSync(scopedDirectory, { recursive: true })
    const packageDirectory = configPluginsRoot.slice(0, -'/package.json'.length)
    await import('node:fs/promises').then(({ symlink }) =>
      symlink(packageDirectory, join(scopedDirectory, 'config-plugins'), 'dir')
    )

    const config = withVxrn({
      name: 'TestApp',
      slug: 'test-app',
      ios: { bundleIdentifier: 'dev.one.test' },
      android: { package: 'dev.one.test' },
      _internal: { projectRoot },
    })
    await config.mods.ios.dangerous({
      ...config,
      modRequest: {
        platformProjectRoot: iosRoot,
        projectRoot,
        platform: 'ios',
        modName: 'dangerous',
        projectName: 'TestApp',
        introspect: false,
      },
      modResults: {},
    })

    const result = readFileSync(join(iosRoot, 'Podfile'), 'utf8')
    expect(result).toContain('[vxrn/one] fmt c++17 fix')
    expect(result).toContain('[vxrn/one] minify iOS Hermes Release bundle input')
    expect(result).toContain("ENV['RNS_GAMMA_ENABLED'] ||= '1'")
  })
})
