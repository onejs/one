import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { applyConfigPlugins } from './prebuildConfigPlugins'
import {
  assertNativeModuleRuntimes,
  generateForPlatform,
  type PrebuildAppConfig,
} from './prebuildWithoutExpo'

const workspaceModules = fileURLToPath(
  new URL('../../../../node_modules', import.meta.url)
)

const app = {
  name: 'MyApp',
  ios: { bundleId: 'dev.one.myapp', infoPlist: { FixtureKey: 'from-native-app' } },
  android: { applicationId: 'dev.one.myapp', blockedPermissions: ['CAMERA'] },
} satisfies PrebuildAppConfig

// edits the same four files hot updater's plugin edits, through the plugin
// library an app plugin imports, with modes for the failures prebuild names.
const FIXTURE_PLUGIN = `const {
  AndroidConfig,
  WarningAggregator,
  withAndroidManifest,
  withAppDelegate,
  withDangerousMod,
  withInfoPlist,
  withMainApplication,
  withStringsXml,
} = require('expo/config-plugins')
const fs = require('node:fs')
const path = require('node:path')

const RELEASE_BUNDLE = 'Bundle.main.url(forResource: "main", withExtension: "jsbundle")'

module.exports = (config, { channel = 'production', mode } = {}) => {
  config = withInfoPlist(config, (config) => {
    config.modResults.HotUpdaterChannel = channel
    if (mode === 'change-plist') config.modResults.FixtureKey = 'from-plugin'
    return config
  })
  config = withAppDelegate(config, (config) => {
    const source = config.modResults.contents
    if (mode === 'take-updates') {
      config.modResults.contents = source.replace('OneUpdatesBundleURL()', 'HotUpdater.bundleURL()')
    } else if (source.includes(RELEASE_BUNDLE)) {
      config.modResults.contents = source.replace(RELEASE_BUNDLE, 'HotUpdater.bundleURL()')
    } else {
      WarningAggregator.addWarningIOS('fixture-hot-updater', 'Could not find the release bundleURL in AppDelegate.swift')
    }
    return config
  })
  config = withStringsXml(config, (config) => {
    config.modResults = AndroidConfig.Strings.setStringItem(
      [AndroidConfig.Resources.buildResourceItem({ name: 'hot_updater_channel', value: channel })],
      config.modResults
    )
    return config
  })
  config = withMainApplication(config, (config) => {
    config.modResults.contents = config.modResults.contents.replace(
      'loadReactNative(this)',
      'loadReactNative(this)\\n    HotUpdater.init(this)'
    )
    if (mode === 'android-bundle') {
      config.modResults.contents = config.modResults.contents.replace(
        '        },\\n    )',
        '        },\\n      jsBundleFilePath = HotUpdater.getJSBundleFile(applicationContext),\\n    )'
      )
    }
    return config
  })
  if (mode === 'add-blocked') {
    config = withAndroidManifest(config, (config) => {
      config.modResults.manifest['uses-permission'].push({
        $: { 'android:name': 'android.permission.CAMERA' },
      })
      return config
    })
  }
  if (mode === 'strip-marker') {
    config = withDangerousMod(config, [
      'ios',
      async (config) => {
        const podfile = path.join(config.modRequest.platformProjectRoot, 'Podfile')
        fs.writeFileSync(
          podfile,
          fs.readFileSync(podfile, 'utf8').replace(/^.*\\[vxrn\\/one\\] fmt c\\+\\+17 fix.*$/m, '')
        )
        return config
      },
    ])
  }
  return config
}
`

function fixtureRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'vxrn-config-plugins-'))
  mkdirSync(join(root, 'node_modules', '@react-native-community'), { recursive: true })
  symlinkSync(
    join(workspaceModules, '@react-native-community', 'template'),
    join(root, 'node_modules', '@react-native-community', 'template')
  )
  symlinkSync(
    join(workspaceModules, 'react-native'),
    join(root, 'node_modules', 'react-native')
  )
  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify({ name: 'fixture', dependencies: { 'react-native': '*' } })
  )
  mkdirSync(join(root, 'plugins'))
  writeFileSync(join(root, 'plugins', 'hot-updater.cjs'), FIXTURE_PLUGIN)
  writeFileSync(
    join(root, 'plugins', 'esm.mjs'),
    `import { withInfoPlist } from 'expo/config-plugins'
import { withStringsXml } from '@expo/config-plugins'
export default (config) =>
  withStringsXml(
    withInfoPlist(config, (config) => {
      config.modResults.EsmPlugin = true
      return config
    }),
    (config) => config
  )
`
  )
  writeFileSync(
    join(root, 'plugins', 'plain-warning.cjs'),
    `const { withAppDelegate } = require('expo/config-plugins')
module.exports = (config) =>
  withAppDelegate(config, (config) => {
    console.warn('Unable to find the native init anchor in AppDelegate.swift')
    return config
  })
`
  )
  writeFileSync(
    join(root, 'plugins', 'append-bundle-script.cjs'),
    `const { withXcodeProject } = require('expo/config-plugins')
module.exports = (config) =>
  withXcodeProject(config, (config) => {
    const phases = config.modResults.hash.project.objects.PBXShellScriptBuildPhase
    for (const phase of Object.values(phases)) {
      if (typeof phase === 'object' && phase.shellScript?.includes('react-native-xcode.sh')) {
        phase.shellScript = JSON.stringify(JSON.parse(phase.shellScript) + '\\necho uploaded sourcemaps')
      }
    }
    return config
  })
`
  )
  writeFileSync(
    join(root, 'plugins', 'needs-expo.cjs'),
    `const { getConfig } = require('expo/config')\nmodule.exports = (config) => config\n`
  )
  return root
}

async function prebuild(
  root: string,
  manifest: PrebuildAppConfig,
  platforms: ('ios' | 'android')[] = ['ios', 'android']
) {
  for (const platform of platforms) await generateForPlatform(root, platform, manifest)
  await applyConfigPlugins({ root, app: manifest, platforms })
}

function snapshot(dir: string): Record<string, string> {
  const files: Record<string, string> = {}
  const walk = (current: string) => {
    for (const entry of readdirSync(current)) {
      const file = join(current, entry)
      if (statSync(file).isDirectory()) walk(file)
      else files[relative(dir, file)] = readFileSync(file).toString('base64')
    }
  }
  walk(join(dir, 'ios'))
  walk(join(dir, 'android'))
  return files
}

const read = (root: string, file: string) => readFileSync(join(root, file), 'utf8')

const withPlugin = (
  options?: Record<string, unknown>,
  manifest: PrebuildAppConfig = app
) =>
  ({
    ...manifest,
    plugins: [
      options ? ['./plugins/hot-updater.cjs', options] : './plugins/hot-updater.cjs',
    ],
  }) as PrebuildAppConfig

describe('native.app.plugins', () => {
  it('runs a plugin that imports expo/config-plugins and reproduces its output', async () => {
    const root = fixtureRoot()
    const manifest = withPlugin({ channel: 'beta' })
    await prebuild(root, manifest)

    expect(read(root, 'ios/MyApp/Info.plist')).toContain('<key>HotUpdaterChannel</key>')
    expect(read(root, 'ios/MyApp/Info.plist')).toContain(
      '<string>from-native-app</string>'
    )
    expect(read(root, 'ios/MyApp/AppDelegate.swift')).toContain('HotUpdater.bundleURL()')
    expect(read(root, 'android/app/src/main/res/values/strings.xml')).toContain(
      '<string name="hot_updater_channel">beta</string>'
    )
    expect(
      read(root, 'android/app/src/main/java/dev/one/myapp/MainApplication.kt')
    ).toContain('HotUpdater.init(this)')

    const first = snapshot(root)
    await prebuild(root, manifest)
    expect(snapshot(root)).toEqual(first)
  }, 180000)

  it('gives esm plugins the pinned plugin library', async () => {
    const root = fixtureRoot()
    await prebuild(root, { ...app, plugins: ['./plugins/esm.mjs'] })
    expect(read(root, 'ios/MyApp/Info.plist')).toContain('<key>EsmPlugin</key>')
  }, 180000)

  it('lets a plugin extend the bundle script one prebuild patches', async () => {
    const root = fixtureRoot()
    await prebuild(root, { ...app, plugins: ['./plugins/append-bundle-script.cjs'] })
    expect(read(root, 'ios/MyApp.xcodeproj/project.pbxproj')).toContain(
      'echo uploaded sourcemaps'
    )
  }, 180000)

  it('fails on any warning a plugin prints', async () => {
    const root = fixtureRoot()
    await expect(
      prebuild(root, { ...app, plugins: ['./plugins/plain-warning.cjs'] })
    ).rejects.toThrow(
      /native\.app\.plugins warned: "Unable to find the native init anchor in AppDelegate\.swift"\. One starts React Native from SceneDelegate\.swift/
    )
  }, 180000)

  it('fails on a plugin warning, naming the plugin', async () => {
    const root = fixtureRoot()
    await expect(
      prebuild(
        root,
        withPlugin(undefined, { ...app, updates: { runtimeVersion: 'test-1' } })
      )
    ).rejects.toThrow(
      /fixture-hot-updater could not finish on iOS: "Could not find the release bundleURL in AppDelegate\.swift"\. One starts React Native from SceneDelegate\.swift/
    )
  }, 180000)

  it('fails when a plugin removes a line one prebuild owns', async () => {
    const root = fixtureRoot()
    await expect(prebuild(root, withPlugin({ mode: 'strip-marker' }))).rejects.toThrow(
      /changed a line one prebuild owns in ios\/Podfile:\n {2}# \[vxrn\/one\] fmt c\+\+17 fix/
    )
  }, 180000)

  it('fails on a second OTA provider', async () => {
    const root = fixtureRoot()
    await expect(
      prebuild(
        root,
        withPlugin(
          { mode: 'take-updates' },
          { ...app, updates: { runtimeVersion: 'test-1' } }
        )
      )
    ).rejects.toThrow(
      'native.app.updates and a config plugin both set the Release bundle URL in ios/MyApp/AppDelegate.swift'
    )
  }, 180000)

  it('fails on a second OTA provider that leaves one.updates in place', async () => {
    const root = fixtureRoot()
    const manifest = withPlugin(
      { mode: 'android-bundle' },
      { ...app, updates: { runtimeVersion: 'test-1' } }
    )
    await expect(prebuild(root, manifest, ['android'])).rejects.toThrow(
      'native.app.updates and a config plugin both set the Release bundle URL in android/app/src/main/java/dev/one/myapp/MainApplication.kt'
    )
    // without one.updates the plugin owns the bundle
    await prebuild(root, withPlugin({ mode: 'android-bundle' }), ['android'])
    expect(
      read(root, 'android/app/src/main/java/dev/one/myapp/MainApplication.kt')
    ).toContain('jsBundleFilePath = HotUpdater.getJSBundleFile(applicationContext)')
  }, 180000)

  it('fails when a plugin changes a native.app plist value', async () => {
    const root = fixtureRoot()
    await expect(prebuild(root, withPlugin({ mode: 'change-plist' }))).rejects.toThrow(
      /changed ios\/MyApp\/Info\.plist at \.FixtureKey/
    )
  }, 180000)

  it('fails when a plugin requests a blocked permission', async () => {
    const root = fixtureRoot()
    await expect(prebuild(root, withPlugin({ mode: 'add-blocked' }))).rejects.toThrow(
      'native.app.plugins added android.permission.CAMERA, which native.app.android.blockedPermissions blocks'
    )
  }, 180000)

  it('fails on a plugin that needs the expo package', async () => {
    const root = fixtureRoot()
    await expect(
      prebuild(root, { ...app, plugins: ['./plugins/needs-expo.cjs'] })
    ).rejects.toThrow(
      'plugins/needs-expo.cjs imports expo/config, which needs the expo package'
    )
  }, 180000)
})

describe('native module runtimes', () => {
  function dependency(root: string, name: string, files: Record<string, unknown>) {
    const dir = join(root, 'node_modules', name)
    mkdirSync(dir, { recursive: true })
    for (const [file, content] of Object.entries(files)) {
      writeFileSync(join(dir, file), JSON.stringify(content))
    }
    return dir
  }

  it('fails for an expo module autolinking leaves unlinked', () => {
    const root = mkdtempSync(join(tmpdir(), 'vxrn-module-runtimes-'))
    const expoCamera = dependency(root, 'expo-camera', {
      'package.json': { name: 'expo-camera', version: '58.0.0' },
      'expo-module.config.json': { platforms: ['apple', 'android'] },
    })
    const inventory = [
      { name: 'expo-camera', version: '58.0.0', root: expoCamera, platforms: [] },
    ]
    expect(() =>
      assertNativeModuleRuntimes({ root, inventory, platforms: ['ios'] })
    ).toThrow('[one] expo-camera is an Expo module and needs the Expo Modules runtime')
    // an expo module for another platform does not block this one
    const androidOnly = dependency(root, 'android-only', {
      'expo-module.config.json': { platforms: ['android'] },
    })
    expect(() =>
      assertNativeModuleRuntimes({
        root,
        inventory: [
          { name: 'android-only', version: '1.0.0', root: androidOnly, platforms: [] },
        ],
        platforms: ['ios'],
      })
    ).not.toThrow()
  })

  it('keeps a linked library that also ships an expo adapter', () => {
    const root = mkdtempSync(join(tmpdir(), 'vxrn-module-runtimes-'))
    const sentry = dependency(root, '@sentry/react-native', {
      'expo-module.config.json': { platforms: ['apple', 'android'] },
    })
    expect(() =>
      assertNativeModuleRuntimes({
        root,
        inventory: [
          {
            name: '@sentry/react-native',
            version: '8.0.0',
            root: sentry,
            platforms: ['android', 'ios'],
          },
        ],
        platforms: ['ios', 'android'],
      })
    ).not.toThrow()
  })

  it('fails when the app resolves another nitro runtime than one links', () => {
    const root = mkdtempSync(join(tmpdir(), 'vxrn-module-runtimes-'))
    writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'fixture' }))
    dependency(root, 'react-native-nitro-modules', {
      'package.json': { name: 'react-native-nitro-modules', version: '0.36.2' },
    })
    const linked = (version: string) => [
      {
        name: 'react-native-nitro-modules',
        version,
        root: '/one/copy',
        platforms: ['android', 'ios'],
      },
    ]
    expect(() =>
      assertNativeModuleRuntimes({
        root,
        inventory: linked('0.37.1'),
        platforms: ['ios'],
      })
    ).toThrow(
      "[one] react-native-nitro-modules resolves to 0.36.2 for the app, while One links 0.37.1. Remove the app's copy or pin 0.37.1."
    )
    expect(() =>
      assertNativeModuleRuntimes({
        root,
        inventory: linked('0.36.2'),
        platforms: ['ios'],
      })
    ).not.toThrow()
  })
})
