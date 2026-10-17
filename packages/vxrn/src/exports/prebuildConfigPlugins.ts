import module from 'node:module'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import type { ExportedConfig, ModPlatform } from '@expo/config-plugins'
import {
  expoClientFromNativeApp,
  type NativeAppManifest,
} from '@vxrn/utils/nativeAppManifest'
import FSExtra from 'fs-extra'

type Platform = Extract<ModPlatform, 'ios' | 'android'>

type ExpoConfig = ExportedConfig

const requireVxrn = module.createRequire(import.meta.url)

// what one writes into the generated projects and must still find after the
// plugins ran: the patch markers its render-time checks place, the host calls
// they wrap, and autolinking. mods re-serialize xml, plist and xcode project
// files, so each line, and each line of a script escaped into one, compares
// without its indentation.
const ONE_OWNED =
  /\[vxrn\/one\]|OneUpdatesBundleURL\(\)|OneHoldLaunchScreen\(|startReactNative\(|autolinkLibrariesFromCommand\(/

function units(content: string): string[] {
  return content.split(/\n|\\n/).map((unit) => unit.trim())
}

// the host files that choose where the release bundle loads from, and the
// code that names a bundle source in them.
const BUNDLE_HOST_FILES = new Set([
  'AppDelegate.swift',
  'SceneDelegate.swift',
  'MainApplication.kt',
])
const BUNDLE_SOURCE =
  /jsbundle|bundleURL|JSBundleFile|jsBundleFilePath|jsBundleAssetPath/i

const BINARY_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.jar',
  '.keystore',
  '.ttf',
  '.otf',
])
const SKIPPED_DIRECTORIES = new Set(['Pods', 'build', '.gradle', '.cxx', 'node_modules'])

// files expo's template reads and one's does not: settings a plugin writes
// there would be dropped without a trace.
const EXPO_TEMPLATE_FILES = ['ios/Podfile.properties.json']

// runs the app's expo config plugins on the projects one generated, after
// one's own edits and before anything installs, then checks one's host
// survived them. apps without plugins load nothing.
export async function applyConfigPlugins(args: {
  root: string
  app: NativeAppManifest
  platforms: Platform[]
}): Promise<void> {
  const { root, app, platforms } = args
  if (!app.plugins?.length) return

  const before = snapshotGeneratedProjects(root, platforms)
  const config = expoConfigForPlugins(root, app)
  const warnings: string[] = []
  const restore = installPluginEnvironment(root, warnings)
  try {
    const { withPlugins, compileModsAsync } = requireVxrn(
      '@expo/config-plugins'
    ) as typeof import('@expo/config-plugins')
    // a one-element entry is the bare name, as expo's resolver reads it
    const withMods = withPlugins(config, app.plugins as Parameters<typeof withPlugins>[1])
    assertConfigFieldsUnchanged(expoConfigForPlugins(root, app), withMods)
    await compileModsAsync(withMods, {
      projectRoot: root,
      platforms,
      assertMissingModProviders: true,
    }).catch((error: Error) => {
      // mod errors quote the whole file they could not match
      throw new Error(
        `[one] native.app.plugins could not apply: ${error.message.split('\n')[0].replace(/ in contents:$/, '')}\nOne's generated files differ from Expo's template: list a local plugin that makes this edit (https://onestack.dev/docs/native-setup#config-plugins), or remove the plugin.`
      )
    })
  } finally {
    restore()
  }
  if (warnings.length) {
    throw new Error(warnings.map(pluginWarningMessage).join('\n\n'))
  }
  assertOneHostIntact(root, app, platforms, before)
}

// the expo config the dev server's manifest already carries, with what the
// mod compiler needs to find the project. plugins see native.app's values.
function expoConfigForPlugins(root: string, app: NativeAppManifest): ExpoConfig {
  const { plugins: _plugins, ...client } = expoClientFromNativeApp(app)
  return JSON.parse(
    JSON.stringify({
      ...client,
      sdkVersion: '58.0.0',
      _internal: { projectRoot: root, packageJsonPath: path.join(root, 'package.json') },
    })
  )
}

// plugins import the plugin library from `expo/config-plugins` or
// `@expo/config-plugins` and expect the host to provide it: both resolve to
// vxrn's pinned copy, from require and import alike, so every plugin shares
// one library without the expo package. any other expo import needs expo
// itself. every warning printed while plugins run is collected so prebuild
// can fail on it.
function installPluginEnvironment(root: string, warnings: string[]): () => void {
  // a relative request inside the pinned package passes this hook untouched
  const requirePinned = module.createRequire(
    requireVxrn.resolve('@expo/config-plugins/package.json')
  )
  const pinned = (subpath: string) => ({
    url: pathToFileURL(requirePinned.resolve(subpath)).href,
    shortCircuit: true,
  })
  const hooks = module.registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier === 'expo/config-plugins' || specifier === '@expo/config-plugins') {
        return pinned('./')
      }
      if (specifier.startsWith('@expo/config-plugins/')) {
        return pinned(`./${specifier.slice('@expo/config-plugins/'.length)}`)
      }
      if (specifier === 'expo' || specifier.startsWith('expo/')) {
        const from = context.parentURL?.startsWith('file:')
          ? path.relative(root, fileURLToPath(context.parentURL))
          : 'a plugin'
        throw new Error(
          `[one] native.app.plugins: ${from} imports ${specifier}, which needs the expo package. one prebuild runs plugins without expo: generate this app with Expo prebuild and vxrn/expo-plugin, or remove the plugin.`
        )
      }
      return nextResolve(specifier, context)
    },
  })
  const warn = console.warn
  console.warn = (...values: unknown[]) => {
    warnings.push(
      values
        .map(String)
        .join(' ')
        .replace(/\u001b\[[0-9;]*m/g, '')
        .trim()
    )
  }
  return () => {
    hooks.deregister()
    console.warn = warn
  }
}

// expo's own plugin warnings read "» ios: <property>: <reason>", where the
// property names the plugin or the mod that could not apply; plugins that
// log for themselves print just the reason.
function pluginWarningMessage(warning: string): string {
  const match = warning.match(/^» (\w+): ([^:]+): ([\s\S]*)$/)
  const reason = (match?.[3] ?? warning).trim()
  const host = /AppDelegate/.test(reason)
    ? ' One starts React Native from SceneDelegate.swift.'
    : ''
  const platform =
    match?.[1] === 'ios' ? 'iOS' : match?.[1] === 'android' ? 'Android' : match?.[1]
  const what = match ? `${match[2]} could not finish on ${platform}` : 'warned'
  return `[one] native.app.plugins ${what}: "${reason}".${host} One's generated files differ from Expo's template: list a local plugin after it that makes this edit (https://onestack.dev/docs/native-setup#config-plugins), or remove the plugin.`
}

const PLUGIN_OWNED_FIELDS = [
  'name',
  'slug',
  'version',
  'ios.bundleIdentifier',
  'ios.buildNumber',
  'android.package',
  'android.versionCode',
] as const

// native.app is the source of these values: a plugin may add plist keys,
// entitlements and permissions, never change or drop the ones native.app set.
function assertConfigFieldsUnchanged(expected: ExpoConfig, actual: ExpoConfig): void {
  for (const field of PLUGIN_OWNED_FIELDS) {
    const [head, key] = field.split('.')
    const want = key ? expected[head]?.[key] : expected[head]
    const got = key ? actual[head]?.[key] : actual[head]
    if (want !== got) {
      throw new Error(
        `[one] native.app.plugins changed ${field} from ${JSON.stringify(want)} to ${JSON.stringify(got)}. Set it in native.app instead.`
      )
    }
  }
  for (const field of [
    'ios.infoPlist',
    'ios.entitlements',
    'android.permissions',
    'android.blockedPermissions',
  ]) {
    const [head, key] = field.split('.')
    const lost = missingValue(expected[head]?.[key], actual[head]?.[key])
    if (lost) {
      throw new Error(
        `[one] native.app.plugins changed ${field}${lost}, which native.app sets. Set it in native.app instead.`
      )
    }
  }
}

// where `after` drops or changes a value of `before`; dictionaries may gain
// keys and arrays may gain entries.
function missingValue(before: unknown, after: unknown, at = ''): string | undefined {
  if (before === undefined) return
  if (Array.isArray(before)) {
    if (!Array.isArray(after)) return at || ' '
    for (const entry of before) {
      if (!after.some((candidate) => !missingValue(entry, candidate))) {
        return `${at} entry ${JSON.stringify(entry)}`
      }
    }
    return
  }
  if (before && typeof before === 'object') {
    if (!after || typeof after !== 'object' || Array.isArray(after)) return at || ' '
    for (const [key, value] of Object.entries(before)) {
      const lost = missingValue(
        value,
        (after as Record<string, unknown>)[key],
        `${at}.${key}`
      )
      if (lost) return lost
    }
    return
  }
  return before === after ? undefined : at || ' '
}

type ProjectSnapshot = Map<
  string,
  {
    ownedLines: string[]
    plist?: unknown
    permissions?: string[]
    hostLines?: Set<string>
  }
>

function snapshotGeneratedProjects(root: string, platforms: Platform[]): ProjectSnapshot {
  const snapshot: ProjectSnapshot = new Map()
  for (const platform of platforms) {
    for (const file of generatedTextFiles(path.join(root, platform))) {
      const content = FSExtra.readFileSync(file, 'utf8')
      snapshot.set(file, {
        ownedLines: units(content).filter((unit) => ONE_OWNED.test(unit)),
        plist: isPlist(file) ? parsePlist(content) : undefined,
        permissions:
          path.basename(file) === 'AndroidManifest.xml'
            ? usesPermissions(content)
            : undefined,
        hostLines: BUNDLE_HOST_FILES.has(path.basename(file))
          ? new Set(units(content))
          : undefined,
      })
    }
  }
  return snapshot
}

function generatedTextFiles(dir: string): string[] {
  if (!FSExtra.existsSync(dir)) return []
  const files: string[] = []
  for (const entry of FSExtra.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRECTORIES.has(entry.name)) files.push(...generatedTextFiles(file))
    } else if (entry.isFile() && !BINARY_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(file)
    }
  }
  return files
}

function isPlist(file: string): boolean {
  return file.endsWith('.plist') || file.endsWith('.entitlements')
}

function parsePlist(content: string): unknown {
  const requireConfigPlugins = module.createRequire(
    requireVxrn.resolve('@expo/config-plugins')
  )
  const plist = requireConfigPlugins('@expo/plist') as {
    default: { parse: (xml: string) => unknown }
  }
  return plist.default.parse(content)
}

// the permissions a manifest requests, without the ones it removes.
function usesPermissions(manifest: string): string[] {
  return (manifest.match(/<uses-permission\b[^>]*>/g) ?? [])
    .filter((tag) => !tag.includes('tools:node="remove"'))
    .map((tag) => tag.match(/android:name="([^"]+)"/)?.[1])
    .filter((name): name is string => !!name)
}

function assertOneHostIntact(
  root: string,
  app: NativeAppManifest,
  platforms: Platform[],
  before: ProjectSnapshot
): void {
  const otaConflict = (relative: string) =>
    new Error(
      `[one] native.app.updates and a config plugin both set the Release bundle URL in ${relative}. Keep one OTA provider.`
    )
  for (const [file, { ownedLines, plist, permissions, hostLines }] of before) {
    const relative = path.relative(root, file)
    if (!FSExtra.existsSync(file)) {
      throw new Error(
        `[one] native.app.plugins removed ${relative}, which one prebuild generates.`
      )
    }
    const content = FSExtra.readFileSync(file, 'utf8')
    const lines = new Set(units(content))
    for (const line of ownedLines) {
      if (lines.has(line)) continue
      if (line.includes('OneUpdatesBundleURL()')) throw otaConflict(relative)
      throw new Error(
        `[one] native.app.plugins changed a line one prebuild owns in ${relative}:\n  ${line}\nList a local plugin that makes the edit without replacing this line, or remove the plugin.`
      )
    }
    if (
      app.updates &&
      hostLines &&
      [...lines].some((line) => !hostLines.has(line) && BUNDLE_SOURCE.test(line))
    ) {
      throw otaConflict(relative)
    }
    const kept = permissions && usesPermissions(content)
    const dropped = permissions?.find((permission) => !kept?.includes(permission))
    if (dropped) {
      throw new Error(
        `[one] native.app.plugins removed ${dropped} from ${relative}, which native.app requests. Remove it from native.app instead.`
      )
    }
    if (plist !== undefined) {
      const lost = missingValue(plist, parsePlist(content))
      if (lost) {
        throw new Error(
          `[one] native.app.plugins changed ${relative} at ${lost.trim() || 'its root'}, a value one prebuild wrote from native.app. Plugins may add keys and array entries; set this value in native.app instead.`
        )
      }
    }
  }

  if (platforms.includes('ios')) {
    const expoFiles = [
      ...EXPO_TEMPLATE_FILES.filter((file) => FSExtra.existsSync(path.join(root, file))),
      ...generatedTextFiles(path.join(root, 'ios'))
        .filter((file) => path.basename(file) === 'Expo.plist')
        .map((file) => path.relative(root, file)),
    ]
    if (expoFiles.length) {
      throw new Error(
        `[one] native.app.plugins wrote ${expoFiles.join(', ')}, which Expo's template reads and one prebuild's does not, so its settings would be dropped. Generate this app with Expo prebuild and vxrn/expo-plugin, or remove the plugin.`
      )
    }
  }

  // a bare name is an android.permission, as prebuild stamps it.
  const blocked = (app.android?.blockedPermissions ?? []).map((name) =>
    name.includes('.') ? name : `android.permission.${name}`
  )
  if (platforms.includes('android') && blocked.length) {
    const manifestPath = path.join(
      root,
      'android',
      'app',
      'src',
      'main',
      'AndroidManifest.xml'
    )
    const requested = usesPermissions(FSExtra.readFileSync(manifestPath, 'utf8'))
    const added = blocked.find((permission) => requested.includes(permission))
    if (added) {
      throw new Error(
        `[one] native.app.plugins added ${added}, which native.app.android.blockedPermissions blocks. Remove it from blockedPermissions or remove the plugin.`
      )
    }
  }
}
