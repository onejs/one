import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
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
  it('keeps WebGPU header resolution inside its own CocoaPods target', () => {
    const generated = patches.injectWebGPUHeaderPathsIntoPodfile(podfile)
    expect(patches.injectWebGPUHeaderPathsIntoPodfile(generated)).toBe(generated)
    const result = JSON.parse(execFileSync('ruby', ['--disable-gems', '-rjson', '-e', `
      Config = Struct.new(:build_settings)
      Target = Struct.new(:name, :build_configurations)
      Project = Struct.new(:targets)
      Installer = Struct.new(:pods_project)
      gpu = Config.new({'USE_HEADERMAP' => 'NO', 'HEADER_SEARCH_PATHS' => ['$(inherited)', '/dawn/include']})
      unrelated = Config.new({'HEADER_SEARCH_PATHS' => '/other/include'})
      $installer = Installer.new(Project.new([Target.new('react-native-webgpu', [gpu]), Target.new('other', [unrelated])]))
      def target(name); yield; end
      def use_native_modules!; {}; end
      def post_install; yield $installer; end
      def react_native_post_install(installer); end
      eval(STDIN.read)
      puts JSON.generate([gpu.build_settings, unrelated.build_settings])
    `], { input: generated, encoding: 'utf8' }))
    expect(result[0].USE_HEADERMAP).toBe('NO')
    expect(result[0].HEADER_SEARCH_PATHS).toEqual([
      '$(inherited)', '/dawn/include',
      '$(PODS_TARGET_SRCROOT)/cpp/rnwgpu',
      '$(PODS_TARGET_SRCROOT)/cpp/rnwgpu/api',
      '$(PODS_TARGET_SRCROOT)/cpp/rnwgpu/api/descriptors',
      '$(PODS_TARGET_SRCROOT)/cpp/jsi',
    ])
    expect(result[1]).toEqual({ HEADER_SEARCH_PATHS: '/other/include' })
  })
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

    expect(result).toContain('cliFile = file(providers.exec {')
    expect(result).toContain('autolinkLibrariesWithApp()')
    expect(result).not.toContain('entryFile = file("../index.js")')
    expect(result).toContain('[vxrn/one] ensure patches are applied')
    expect(patches.addDepsPatchToAppBuildGradle(
      patches.replaceAppBuildGradleReactBlock(result)
    )).toBe(result)
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

function expoProject() {
  const projectRoot = mkdtempSync(join(tmpdir(), 'vxrn-expo-plugin-'))
  temporaryDirectories.push(projectRoot)
  writeFileSync(join(projectRoot, 'package.json'), '{"private":true}')
  const configPluginsRoot = createRequire(import.meta.url).resolve(
    '@expo/config-plugins/package.json'
  )
  const scopedDirectory = join(projectRoot, 'node_modules', '@expo')
  mkdirSync(scopedDirectory, { recursive: true })
  symlinkSync(
    configPluginsRoot.slice(0, -'/package.json'.length),
    join(scopedDirectory, 'config-plugins'),
    'dir'
  )
  // the plugin writes the sdk bindings with the app's one package
  const oneRoot = createRequire(import.meta.url).resolve('one/package.json')
  symlinkSync(oneRoot.slice(0, -'/package.json'.length), join(projectRoot, 'node_modules', 'one'), 'dir')
  return projectRoot
}

describe('vxrn/expo-plugin', () => {
  it('prebuilds an app without SDK imports when Xcode is unavailable', () => {
    const projectRoot = expoProject()
    const iosRoot = join(projectRoot, 'ios')
    mkdirSync(iosRoot)
    writeFileSync(join(iosRoot, 'Podfile'), podfile)
    const output = execFileSync(process.execPath, ['--input-type=module', '-e', `
      import withVxrn from ${JSON.stringify(new URL('../../expo-plugin.cjs', import.meta.url).href)}
      const projectRoot = process.argv[1]
      const config = withVxrn({ name: 'TestApp', slug: 'test-app', _internal: { projectRoot } })
      await config.mods.ios.dangerous({
        ...config,
        modRequest: {
          projectRoot, platformProjectRoot: projectRoot + '/ios',
          platform: 'ios', modName: 'dangerous', projectName: 'TestApp', introspect: false,
        },
        modResults: {},
      })
    `, projectRoot], { env: { ...process.env, PATH: '' }, encoding: 'utf8' })
    expect(output).toBe('')
    expect(existsSync(join(iosRoot, 'OneSwiftPackages', 'OneSDKBindings'))).toBe(false)
    expect(readFileSync(join(iosRoot, 'Podfile'), 'utf8')).toContain('[vxrn/one] fmt c++17 fix')
  })

  it('raises the ios deployment target to the one the One pod requires', async () => {
    const projectRoot = expoProject()
    const config = withVxrn({ name: 'TestApp', slug: 'test-app', _internal: { projectRoot } })
    const run = async (modResults) =>
      (await config.mods.ios.podfileProperties({
        ...config,
        modRequest: { projectRoot, platform: 'ios', modName: 'podfileProperties', projectName: 'TestApp', introspect: false },
        modResults,
      })).modResults['ios.deploymentTarget']
    const { minimumVersion } = JSON.parse(
      readFileSync(join(projectRoot, 'node_modules/one/schema.json'), 'utf8')
    )
    expect(await run({})).toBe(`${minimumVersion}.0`)
    expect(await run({ 'ios.deploymentTarget': '16.4' })).toBe(`${minimumVersion}.0`)
    expect(await run({ 'ios.deploymentTarget': '99.0' })).toBe('99.0')
  })

  it('combines background location and audio modes', async () => {
    const projectRoot = expoProject()
    const config = withVxrn(
      { name: 'TestApp', slug: 'test-app', _internal: { projectRoot } },
      { location: { whenInUse: 'Track a hike.', background: true }, audio: { background: true } }
    )
    const result = await config.mods.ios.infoPlist({
      ...config,
      modRequest: { projectRoot, platform: 'ios', modName: 'infoPlist', projectName: 'TestApp', introspect: false },
      modResults: {},
    })
    expect(result.modResults.NSLocationWhenInUseUsageDescription).toBe('Track a hike.')
    expect(result.modResults.UIBackgroundModes).toEqual(['audio', 'location'])
  })

  it('stamps separate Photos save and read usage descriptions', async () => {
    const projectRoot = expoProject()
    const config = withVxrn(
      { name: 'TestApp', slug: 'test-app', _internal: { projectRoot } },
      { photoLibrary: { addOnly: 'Save a photo.', readWrite: 'Browse photos.' } }
    )
    const result = await config.mods.ios.infoPlist({
      ...config,
      modRequest: { projectRoot, platform: 'ios', modName: 'infoPlist', projectName: 'TestApp', introspect: false },
      modResults: {},
    })
    expect(result.modResults.NSPhotoLibraryAddUsageDescription).toBe('Save a photo.')
    expect(result.modResults.NSPhotoLibraryUsageDescription).toBe('Browse photos.')
    expect(result.modResults.PHPhotoLibraryPreventAutomaticLimitedAccessAlert).toBe(true)
  })

  it('stamps the same notification entries as one prebuild', async () => {
    const projectRoot = expoProject()
    const config = withVxrn(
      {
        name: 'TestApp',
        slug: 'test-app',
        _internal: { projectRoot },
      },
      { notifications: { push: true } }
    )
    const modRequest = { projectRoot, introspect: false, projectName: 'TestApp' }
    const run = (platform, mod, modResults) =>
      config.mods[platform][mod]({
        ...config,
        modRequest: { ...modRequest, platform, modName: mod },
        modResults,
      })

    const infoPlist = (await run('ios', 'infoPlist', {})).modResults
    expect(infoPlist[patches.ONE_NOTIFICATIONS.enabledInfoPlistKey]).toBe(true)
    expect(infoPlist[patches.ONE_NOTIFICATIONS.pushInfoPlistKey]).toBe(true)
    const entitlements = (await run('ios', 'entitlements', {})).modResults
    expect(entitlements['aps-environment']).toBe('development')

    const manifest = {
      manifest: {
        $: {},
        'uses-permission': [{ $: { 'android:name': 'android.permission.INTERNET' } }],
        application: [{ $: { 'android:name': '.MainApplication' }, activity: [] }],
      },
    }
    const once = (await run('android', 'manifest', manifest)).modResults
    const twice = (await run('android', 'manifest', once)).modResults
    const application = twice.manifest.application[0]
    expect(twice.manifest['uses-permission'].map((p) => p.$['android:name'])).toEqual([
      'android.permission.INTERNET',
      ...patches.ONE_NOTIFICATIONS.androidPermissions,
    ])
    expect(application.receiver.map((r) => r.$['android:name'])).toEqual([
      patches.ONE_NOTIFICATIONS.receiver,
    ])
    expect(application.service.map((r) => r.$['android:name'])).toEqual([
      patches.ONE_NOTIFICATIONS.pushService,
    ])

    const properties = (
      await run('android', 'gradleProperties', [
        { type: 'property', key: 'hermesEnabled', value: 'true' },
      ])
    ).modResults
    expect(properties).toContainEqual({
      type: 'property',
      key: patches.ONE_NOTIFICATIONS.pushGradleProperty,
      value: 'true',
    })
  })

  it('resolves Expo config plugins from the app and binds the dangerous mod', async () => {
    const projectRoot = expoProject()
    const iosRoot = join(projectRoot, 'ios')
    mkdirSync(iosRoot, { recursive: true })
    writeFileSync(join(iosRoot, 'Podfile'), podfile)

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

function nativeSourceProject() {
  const projectRoot = expoProject()
  const packageDir = join(projectRoot, 'native', 'Showcase')
  mkdirSync(packageDir, { recursive: true })
  writeFileSync(
    join(packageDir, 'Package.swift'),
    '// swift-tools-version: 6.2\nimport PackageDescription\n\nlet package = Package(\n  name: "Showcase",\n  platforms: [.iOS(.v17)],\n  targets: [.executableTarget(name: "Showcase", path: ".", swiftSettings: [.swiftLanguageMode(.v6)])],\n)\n'
  )
  writeFileSync(
    join(packageDir, 'Device.swift'),
    '@MainActor final class Device: PeachModule {\n  init() {}\n\n  func info() -> [String: String] {\n    ["model": "expo"]\n  }\n}\n'
  )
  writeFileSync(
    join(projectRoot, 'Device.kt'),
    'object Device : OneModule {\n    fun info(): Map<String, String> = mapOf("model" to "expo")\n}\n'
  )
  const iosRoot = join(projectRoot, 'ios')
  const androidRoot = join(projectRoot, 'android')
  mkdirSync(iosRoot, { recursive: true })
  mkdirSync(join(androidRoot, 'app'), { recursive: true })
  writeFileSync(join(iosRoot, 'Podfile'), podfile)
  return { projectRoot, iosRoot, androidRoot, packageDir }
}

function dangerousRequest(platformProjectRoot, projectRoot, platform) {
  return {
    platformProjectRoot,
    projectRoot,
    platform,
    modName: 'dangerous',
    projectName: 'TestApp',
    introspect: false,
  }
}

describe('vxrn/expo-plugin nativeSource', () => {
  it('rejects a non-boolean nativeSource option', () => {
    const projectRoot = expoProject()
    expect(() =>
      withVxrn(
        { name: 'TestApp', slug: 'test-app', _internal: { projectRoot } },
        { nativeSource: 'yes' }
      )
    ).toThrow('nativeSource must be a boolean')
  })

  it('leaves the project alone when nativeSource is off', async () => {
    const { projectRoot, iosRoot, androidRoot } = nativeSourceProject()
    const config = withVxrn({
      name: 'TestApp',
      slug: 'test-app',
      _internal: { projectRoot },
    })
    await config.mods.ios.dangerous({
      ...config,
      modRequest: dangerousRequest(iosRoot, projectRoot, 'ios'),
      modResults: {},
    })
    expect(existsSync(join(iosRoot, 'OneSwiftPackages'))).toBe(false)
    expect(existsSync(join(androidRoot, 'app/src/main/java/one/source'))).toBe(false)
    expect(readFileSync(join(iosRoot, 'Podfile'), 'utf8')).not.toContain('OneSwiftPackages')
  })

  it('generates swift pods and kotlin sources into the expo project', async () => {
    const { projectRoot, iosRoot, androidRoot } = nativeSourceProject()
    const config = withVxrn(
      { name: 'TestApp', slug: 'test-app', _internal: { projectRoot } },
      { nativeSource: true }
    )
    const iosMod = (modResults) =>
      config.mods.ios.dangerous({
        ...config,
        modRequest: dangerousRequest(iosRoot, projectRoot, 'ios'),
        modResults,
      })
    await iosMod({})
    await config.mods.android.dangerous({
      ...config,
      modRequest: dangerousRequest(androidRoot, projectRoot, 'android'),
      modResults: {},
    })

    // the pod exists and carries the module
    const podDir = join(iosRoot, 'OneSwiftPackages', 'Showcase')
    const podspec = readFileSync(join(podDir, 'Showcase.podspec'), 'utf8')
    expect(podspec).toContain("s.dependency 'One'")
    expect(podspec).toContain("s.swift_version = '6.0'")
    // the sources compile as one pod with the generated glue
    expect(readFileSync(join(podDir, 'Sources', 'Device.swift'), 'utf8')).toContain(
      'PeachModule'
    )
    const glue = readFileSync(join(podDir, 'Sources', 'OneNativeSource.generated.swift'), 'utf8')
    expect(glue).toContain('Showcase.Device')
    expect(glue).toContain('case "info"')
    // the pod is linked into the app target, idempotently
    const once = readFileSync(join(iosRoot, 'Podfile'), 'utf8')
    expect(once).toContain('OneSwiftPackages')
    await iosMod({})
    expect(readFileSync(join(iosRoot, 'Podfile'), 'utf8')).toBe(once)

    // the kotlin sources land with their glue
    const kotlinId = `K_${createHash('sha256').update('Device.kt').digest('hex').slice(0, 16)}`
    const kotlinDir = join(androidRoot, 'app/src/main/java/one/source', kotlinId)
    expect(readFileSync(join(kotlinDir, 'Device.kt'), 'utf8')).toContain('OneModule')
    const kotlinGlue = readFileSync(join(kotlinDir, `OneNativeSource_${kotlinId}.kt`), 'utf8')
    expect(kotlinGlue).toContain(`${kotlinId}.Device`)
    expect(kotlinGlue).toContain('"info"')
    // declarations sit beside the sources for typescript
    expect(readFileSync(join(projectRoot, 'Device.d.kt.ts'), 'utf8')).toContain('Device')
    expect(readFileSync(join(projectRoot, 'native/Showcase/Device.d.swift.ts'), 'utf8')).toContain(
      'Device'
    )
  })

  it('wires compose dependencies for kotlin views and fails fast without anchors', async () => {
    const projectRoot = expoProject()
    writeFileSync(
      join(projectRoot, 'Greeting.kt'),
      'import androidx.compose.material3.Text\nimport androidx.compose.runtime.Composable\n\n@Composable\nfun Greeting(name: String) {\n    Text(name)\n}\n'
    )
    const androidRoot = join(projectRoot, 'android')
    mkdirSync(join(androidRoot, 'app'), { recursive: true })
    writeFileSync(
      join(androidRoot, 'build.gradle'),
      'buildscript {\n    dependencies {\n        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin")\n    }\n}\n'
    )
    const appGradle = join(androidRoot, 'app/build.gradle')
    writeFileSync(
      appGradle,
      'apply plugin: "com.android.application"\napply plugin: "org.jetbrains.kotlin.android"\nandroid {\n}\ndependencies {\n    implementation("com.facebook.react:react-android")\n}\n'
    )
    const config = withVxrn(
      { name: 'TestApp', slug: 'test-app', _internal: { projectRoot } },
      { nativeSource: true }
    )
    const run = () =>
      config.mods.android.dangerous({
        ...config,
        modRequest: dangerousRequest(androidRoot, projectRoot, 'android'),
        modResults: {},
      })
    await run()
    const once = readFileSync(appGradle, 'utf8')
    expect(once).toContain('org.jetbrains.kotlin.plugin.compose')
    expect(once).toContain('compose true')
    expect(once).toContain('androidx.compose.ui:ui')
    await run()
    expect(readFileSync(appGradle, 'utf8')).toBe(once)

    writeFileSync(appGradle, 'android {\n}\n')
    await expect(run()).rejects.toThrow('no kotlin android plugin anchor')
  })

  it('adds material-icons-core only when a kotlin source imports material icons', async () => {
    const projectRoot = expoProject()
    writeFileSync(
      join(projectRoot, 'Greeting.kt'),
      'import androidx.compose.material.icons.Icons\nimport androidx.compose.material.icons.filled.Add\nimport androidx.compose.runtime.Composable\n\n@Composable\nfun Greeting(name: String) {\n}\n'
    )
    const androidRoot = join(projectRoot, 'android')
    mkdirSync(join(androidRoot, 'app'), { recursive: true })
    writeFileSync(
      join(androidRoot, 'build.gradle'),
      'buildscript {\n    dependencies {\n        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin")\n    }\n}\n'
    )
    const appGradle = join(androidRoot, 'app/build.gradle')
    writeFileSync(
      appGradle,
      'apply plugin: "com.android.application"\napply plugin: "org.jetbrains.kotlin.android"\nandroid {\n}\ndependencies {\n    implementation("com.facebook.react:react-android")\n}\n'
    )
    const config = withVxrn(
      { name: 'TestApp', slug: 'test-app', _internal: { projectRoot } },
      { nativeSource: true }
    )
    const run = () =>
      config.mods.android.dangerous({
        ...config,
        modRequest: dangerousRequest(androidRoot, projectRoot, 'android'),
        modResults: {},
      })
    await run()
    const once = readFileSync(appGradle, 'utf8')
    expect(once).toContain('androidx.compose.material:material-icons-core:$materialIconsVersion')
    await run()
    expect(readFileSync(appGradle, 'utf8')).toBe(once)
  })
})
