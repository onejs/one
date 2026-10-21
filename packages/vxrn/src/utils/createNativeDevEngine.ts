/**
 * Creates a rolldown DevEngine for native React Native bundle serving.
 * Uses rolldown's experimental dev() API with ESM output.
 *
 * Inspired by rollipop's architecture:
 * https://github.com/leegeunhyeok/rollipop
 */

import { createHash } from 'node:crypto'
import { basename, dirname, extname, join, relative, resolve, sep } from 'node:path'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  realpathSync,
  readdirSync,
  statSync,
  readFileSync,
  writeFileSync,
  watch,
  type FSWatcher,
} from 'node:fs'
import { pathToFileURL } from 'node:url'
import micromatch from 'micromatch'
import { parseSync } from 'oxc-parser'
import type { InputOptions, OutputOptions, Plugin, RolldownOutput } from 'rolldown'
import type { DevEngine } from 'rolldown/experimental'
import { loadEnv as loadViteEnv, normalizePath } from 'vite'
import { shouldStripFlow, transformHermesAsync } from '@vxrn/compiler'
import { resolvePath } from '@vxrn/resolve'
import {
  macosReactNativeFile,
  requireOneMacosPackageRoot,
} from '@vxrn/utils/macosReactNativeResolve'
import { nativeAppDefines } from '@vxrn/utils/nativeAppManifest'
import type { NativePlatform } from '@vxrn/utils/platformEnv'
import { withExpoPublicEnvAliases } from '@vxrn/utils/publicEnv'
import { DEFAULT_ASSET_EXTS } from '../constants/defaults'
import { getNativePrelude } from '../runtime/native-prelude'
import { rnCodegenPlugin } from '../plugins/rnCodegenPlugin'
import { dedupe } from '../config/getBaseViteConfigOnly'

// Hermes needs the whole class shape lowered *together*. downleveling only the
// class fields while leaving `class ... extends` as modern ES6 produces a
// half-transpiled hierarchy Hermes crashes on at `new Subclass()` (TypeError:
// Cannot read property 'prototype' of undefined). These must stay atomic across
// both SWC call sites and dev/prod. defining them once makes that a fact, not a
// convention (the original bug was `transform-classes` missing from one of two
// hand-copied include lists).
const HERMES_CLASS_TRANSFORMS = [
  'transform-classes',
  'transform-parameters',
  'transform-block-scoping',
  'transform-class-properties',
  'transform-class-static-block',
  'transform-private-methods',
  'transform-private-property-in-object',
] as const

// Hermes V1 rejects async generators in both the dev interpreter and AOT
// compilation. Keep the async lowering identical across modes: a dev bundle
// that parses in Rolldown but redboxes in Hermes is not a usable build.
const HERMES_ASYNC_TRANSFORMS = ['transform-async-to-generator'] as const

/** SWC `env.include` for Hermes-compatible downleveling; see HERMES_CLASS_TRANSFORMS. */
export function getHermesSWCIncludes(dev: boolean): string[] {
  return [...HERMES_CLASS_TRANSFORMS, ...HERMES_ASYNC_TRANSFORMS]
}

export interface NativePluginContext {
  root: string
  platform: NativePlatform
  dev: boolean
}

interface NativeDevEngineOptions {
  root: string
  port: number
  host?: string
  platform: NativePlatform
  serverUrl?: string
  plugins?: Plugin[]
  onHmrUpdate?: (update: NativeHmrUpdate) => void
}

export type NativeHmrUpdate =
  | {
      type: 'hmr:update'
      clientId: string
      code: string
      changedIds: string[]
      seq: number
    }
  // a reload with no clientId goes to every client on the platform: a full
  // build re-expands the route globs for all of them at once
  | { type: 'hmr:reload'; clientId?: string }
  | { type: 'hmr:error' }

/**
 * The served dev bundle and the map that resolves a frame in it back to the
 * authored file. `map` is the serialized JSON, parsed only when a symbolicate
 * request arrives.
 */
export interface NativeDevBundle {
  code: string
  map: string
}

interface NativeDevEngineResult {
  engine: DevEngine
  getBundle: () => Promise<NativeDevBundle>
  getSourceMap: () => Promise<string>
  getAsset: (pathname: string, hash?: string) => NativeDevAsset | undefined
  close: () => Promise<void>
}

const NATIVE_PLATFORM_EXTENSIONS: Record<NativePlatform, string[]> = {
  ios: ['.ios.tsx', '.ios.ts', '.ios.jsx', '.ios.js'],
  android: ['.android.tsx', '.android.ts', '.android.jsx', '.android.js'],
  macos: ['.macos.tsx', '.macos.ts', '.macos.jsx', '.macos.js'],
}

const NATIVE_SHARED_EXTENSIONS = [
  '.native.tsx',
  '.native.ts',
  '.native.jsx',
  '.native.js',
]

const PLAIN_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.cjs', '.json']

// shared resolve extensions for native builds. macos does not list .ios:
// that fallback is only for files inside the react-native package.
function getResolveExtensions(platform: NativePlatform): string[] {
  return [
    ...NATIVE_PLATFORM_EXTENSIONS[platform],
    ...NATIVE_SHARED_EXTENSIONS,
    ...PLAIN_EXTENSIONS,
  ]
}

// shared rolldown resolve config for native builds
function getNativeResolveConfig(platform: NativePlatform) {
  return {
    extensions: getResolveExtensions(platform),
    // Rolldown supplies `import`, `require`, and `default` contextually. Adding
    // both here makes a CommonJS require eligible for an export map's ESM
    // `import` target (for example @babel/runtime), which turns callable CJS
    // helpers into namespace objects at runtime.
    conditionNames: ['react-native', 'browser'],
    // Native CommonJS consumers need the package's main export shape (punycode
    // exposes ucs2 there, but only its default export contains it in module).
    mainFields: ['react-native', 'browser', 'main', 'module'],
    aliasFields: [['react-native'], ['browser']],
  }
}

// shared rolldown transform config for native builds
export function getNativeTransformConfig(
  platform: NativePlatform,
  dev: boolean,
  root: string
) {
  // read setupFile defines from One's config (mirrors one:init-config define block)
  const entryConfig = (globalThis as any).__vxrnNativeEntryConfig || {}
  const setupFileDefines = (() => {
    const sf = entryConfig.setupFile
    if (!sf) return {}
    const files =
      typeof sf === 'string'
        ? { client: sf, server: sf, ios: sf, android: sf }
        : 'native' in sf
          ? { client: sf.client, server: sf.server, ios: sf.native, android: sf.native }
          : sf
    return {
      ...(files.client && {
        'process.env.ONE_SETUP_FILE_CLIENT': JSON.stringify(files.client),
      }),
      ...(files.server && {
        'process.env.ONE_SETUP_FILE_SERVER': JSON.stringify(files.server),
      }),
      ...(files.ios && { 'process.env.ONE_SETUP_FILE_IOS': JSON.stringify(files.ios) }),
      ...(files.android && {
        'process.env.ONE_SETUP_FILE_ANDROID': JSON.stringify(files.android),
      }),
    }
  })()

  // app-supplied defines (One's native.bundlerOptions.define). vite's rule:
  // a string is a raw expression, anything else is JSON stringified. rolldown's
  // binding only accepts strings, so normalize rather than crashing the build.
  const userDefines: Record<string, string> = {}
  for (const [key, value] of Object.entries(
    ((globalThis as any).__vxrnNativeUserDefine || {}) as Record<string, unknown>
  )) {
    userDefines[key] = typeof value === 'string' ? value : JSON.stringify(value)
  }

  const mode = dev ? 'development' : 'production'

  // One defaults to ONE_PUBLIC_ while retaining Expo's established public env
  // contract. Missing Expo names receive exact One values; explicit values stay distinct.
  const publicEnv = withExpoPublicEnvAliases(
    loadViteEnv(mode, root, ['VITE_', 'ONE_PUBLIC_', 'EXPO_PUBLIC_'])
  )
  const envDefines: Record<string, string> = {}
  for (const [key, value] of Object.entries(publicEnv)) {
    envDefines[`import.meta.env.${key}`] = JSON.stringify(value)
    envDefines[`process.env.${key}`] = JSON.stringify(value)
  }

  // Build the full import.meta.env object for when it's used as a whole (e.g.
  // JSON.stringify(import.meta.env)). `one/vite` initializes the config-loading
  // process as SSR, so loadViteEnv() can inherit VITE_ENVIRONMENT=ssr from the
  // shell. Public env belongs first: the native platform contract below must be
  // authoritative over inherited web/server values.
  const envObject: Record<string, any> = {
    ...publicEnv,
    MODE: mode,
    DEV: dev,
    PROD: !dev,
    SSR: false,
    VITE_ENVIRONMENT: platform,
    VITE_NATIVE: '1',
    ONE_PLATFORM: platform,
    EXPO_OS: platform,
    TAMAGUI_TARGET: 'native',
    TAMAGUI_ENVIRONMENT: platform,
  }

  return {
    jsx: {
      // use 'classic' mode (babel plugin-transform-react-jsx)
      // 'automatic' has files where jsxDEV import fails to resolve
      runtime: 'classic' as const,
    },
    define: {
      // first in the map, so nothing the user set can shadow a platform-owned
      // key below.
      ...userDefines,
      ...nativeAppDefines(entryConfig.app),
      // Public values are applied first so platform-owned keys cannot inherit
      // the SSR values used while loading One's Vite config.
      ...envDefines,
      'process.env.NODE_ENV': JSON.stringify(mode),
      'process.env.VXRN_REACT_19': 'false',
      'process.env.VITE_ENVIRONMENT': JSON.stringify(platform),
      'process.env.VITE_NATIVE': '"1"',
      'process.env.ONE_PLATFORM': JSON.stringify(platform),
      'process.env.EXPO_OS': JSON.stringify(platform),
      'process.env.TAMAGUI_TARGET': '"native"',
      'process.env.TAMAGUI_ENVIRONMENT': JSON.stringify(platform),
      __DEV__: dev ? 'true' : 'false',
      // import.meta.env as a whole object (for JSON.stringify(import.meta.env) etc.)
      'import.meta.env': JSON.stringify(envObject),
      // import.meta.env.* individual properties (for direct access)
      'import.meta.env.MODE': JSON.stringify(mode),
      'import.meta.env.DEV': dev ? 'true' : 'false',
      'import.meta.env.PROD': dev ? 'false' : 'true',
      'import.meta.env.SSR': 'false',
      'import.meta.env.VITE_ENVIRONMENT': JSON.stringify(platform),
      'import.meta.env.VITE_NATIVE': '"1"',
      'import.meta.env.ONE_PLATFORM': JSON.stringify(platform),
      'import.meta.env.EXPO_OS': JSON.stringify(platform),
      'import.meta.env.TAMAGUI_TARGET': '"native"',
      'import.meta.env.TAMAGUI_ENVIRONMENT': JSON.stringify(platform),
      ...setupFileDefines,
    },
    // auto-inject React import for classic JSX (React.createElement)
    inject: {
      React: 'react',
    },
  }
}

function macosReactNativeResolvePlugin(root: string): Plugin {
  const oneMacosRoot = requireOneMacosPackageRoot(root)
  return {
    name: 'vxrn:macos-react-native-resolve',
    resolveId(source, importer) {
      if (!importer) return
      const file = macosReactNativeFile(importer, source, oneMacosRoot)
      if (file) return file
    },
  }
}

// third-party packages often ship a component as .ios and .android only.
// macos does not load the ios source. the stub keeps the import linkable and
// throws when the export is called or rendered.
const PLATFORM_VARIANT_EXTS = [
  '.ios.tsx',
  '.ios.ts',
  '.ios.jsx',
  '.ios.js',
  '.android.tsx',
  '.android.ts',
  '.android.jsx',
  '.android.js',
]

function macosNormalFile(target: string, source: string): boolean {
  if (/\.(?:tsx|ts|jsx|js|mjs|cjs|json)$/.test(source)) return existsSync(target)
  const extensions = getResolveExtensions('macos')
  for (const ext of extensions) {
    if (existsSync(target + ext)) return true
    if (existsSync(join(target, 'index' + ext))) return true
  }
  return false
}

function macosVariantSource(target: string): string | null {
  for (const ext of PLATFORM_VARIANT_EXTS) {
    const file = target + ext
    if (existsSync(file)) return file
  }
  return null
}

function macosStubLabel(variantFile: string): string {
  let dir = dirname(variantFile)
  for (let i = 0; i < 8; i++) {
    const manifest = join(dir, 'package.json')
    if (existsSync(manifest)) {
      try {
        const name = JSON.parse(readFileSync(manifest, 'utf8')).name
        if (typeof name === 'string' && name.length > 0) {
          const rel = relative(dir, variantFile)
            .split('\\')
            .join('/')
            .replace(/\.(?:ios|android)\.(?:tsx|ts|jsx|js)$/, '')
          return `${name}/${rel}`
        }
      } catch {
        // keep walking to a readable manifest
      }
    }
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return variantFile
}

function macosStubCode(variantFile: string): string {
  const code = readFileSync(variantFile, 'utf8')
  const message = `${macosStubLabel(variantFile)} has no macOS implementation; add a .macos file`
  const names = new Set<string>()
  let hasDefault = /export\s+default\b/.test(code)
  for (const match of code.matchAll(
    /export\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)/g
  )) {
    names.add(match[1])
  }
  for (const match of code.matchAll(/export\s*\{([^}]+)\}/g)) {
    for (const part of match[1].split(',')) {
      const seg = part.trim().replace(/^type\s+/, '')
      if (!seg) continue
      const bits = seg.split(/\s+as\s+/)
      const name = (bits[1] || bits[0]).trim()
      if (!name) continue
      if (name === 'default') hasDefault = true
      else names.add(name)
    }
  }
  const lines = [
    `const __missing = () => { throw new Error(${JSON.stringify(message)}) }`,
  ]
  if (hasDefault || names.size === 0) lines.push('export default __missing')
  for (const name of names) lines.push(`export const ${name} = __missing`)
  return lines.join('\n')
}

function macosPlatformSplitStubPlugin(): Plugin {
  const stubs = new Map<string, string>()
  return {
    name: 'vxrn:macos-platform-split-stub',
    resolveId(source, importer) {
      if (!importer || !source.startsWith('.') || source.includes('\0')) return
      if (source.includes('?') || source.includes('#')) return
      const target = resolve(dirname(importer), source)
      if (macosNormalFile(target, source)) return
      const variant = macosVariantSource(target)
      if (!variant) return
      const id = `\0macos-platform-stub:${target}`
      stubs.set(id, macosStubCode(variant))
      return id
    },
    load(id) {
      const code = stubs.get(id)
      if (code == null) return
      return { code, moduleType: 'js' as const }
    },
  }
}

// built packages import siblings by their full name (./one.native.js), so
// .macos resolution never sees them. when the build emitted a .macos.native.js
// beside the target, macos loads that file instead. the variant itself still
// imports the shared file.
function macosDistVariantPlugin(): Plugin {
  return {
    name: 'vxrn:macos-dist-variant',
    resolveId(source, importer) {
      if (!importer || !source.startsWith('.') || !source.endsWith('.native.js')) return
      if (source.endsWith('.macos.native.js')) return
      const target = resolve(dirname(importer), source)
      const variant = target.replace(/\.native\.js$/, '.macos.native.js')
      if (variant === importer || !existsSync(variant)) return
      return variant
    },
  }
}

// shared plugins used by both dev and prod native builds
function getNativePlugins(
  root: string,
  platform: NativePluginContext['platform'],
  viteImportGlobPlugin: any,
  dev: boolean,
  assetsDest?: string,
  onAsset?: (asset: NativeAssetData) => void,
  sourceMaps = false,
  userPlugins: Plugin[] = [],
  minify = false
): Plugin[] {
  const context: NativePluginContext = { root, platform, dev }
  return [
    ...(platform === 'macos'
      ? [
          macosReactNativeResolvePlugin(root),
          macosDistVariantPlugin(),
          macosPlatformSplitStubPlugin(),
        ]
      : []),
    // plugins provided by One (clientTreeShakePlugin for loader removal, etc.)
    ...(globalThis.__vxrnAddNativePlugins?.(platform) || []),
    // block .server.* and _middleware.* files from entering the native bundle
    serverFileExclusionPlugin(),
    // guard server-only / client-only / web-only / native-only imports
    environmentGuardPlugin(),
    missingDynamicImportPlugin(),
    // alias RN's Metro HMR client to a no-op; vxrn drives HMR itself (the
    // rolldown-runtime WebSocket); RN's client otherwise opens a /hot socket and
    // red-boxes "unknown-message [object Object]" on every edit (new arch)
    hmrClientNoopPlugin(),
    nativeIdentityAliasPlugin(platform),
    nativeAssetRegistryPlugin(root),
    // route every `react-native/*` import through the app's react native copy.
    // two reasons: package managers can install the same react native version at
    // multiple physical paths and rolldown assigns each path its own module
    // identity (resolving to one copy keeps initializeCore from running twice),
    // and react native 0.87 narrowed its package.json `exports` (dropping `./*`
    // and `./src/*`), so deep imports such as
    // `react-native/src/private/featureflags/ReactNativeFeatureFlags` — which
    // @react-native/virtualized-lists itself makes — fail resolution against
    // the export map. metro resolves those from the filesystem, so do the same.
    reactNativeDedupePlugin(root),
    nativePackageDedupePlugin(root),
    // stub CSS imports — native doesn't support CSS and rolldown removed CSS bundling
    cssStubPlugin(),
    // handle import.meta.glob (used by One's route system)
    viteImportGlobPlugin({ root }),
    // native codegen needs the original type declarations.
    rnCodegenPlugin({ projectRoot: root }),
    // lower Flow before worklets and react compiler parse the source with oxc.
    flowStripPlugin(),
    vxrnCompilerPlugin(platform, dev, root, sourceMaps),
    mixedNativeModulePlugin(sourceMaps),
    // guard undefined native methods in NativeAnimatedHelper
    nativeAnimatedGuardPlugin(),
    // handle asset imports (.png, .jpg, .ttf, etc.)
    assetPlugin({ root, platform, assetsDest, onAsset }),
    // hermes compat: transform class properties and private fields
    hermesCompatSWCPlugin(dev, sourceMaps, !minify),
    // hermes compat: per-iteration loop bindings. runs last so it also covers
    // loops the earlier lowering steps emit.
    hermesLoopsPlugin(sourceMaps),
    ...userPlugins,
    nativeExportsPrecedencePlugin(root, platform),
    nativeDeclarationAliasPlugin(root, platform),
  ].map((plugin: Plugin) =>
    plugin.api?.vxrnNative ? plugin.api.vxrnNative(context) : plugin
  )
}

// shared output options for native builds. `minify: false` keeps rolldown's
// default `'dce-only'`, which is what native builds have always run with.
function getNativeOutputOptions(
  prelude: string,
  sourcemap: boolean,
  minify: boolean
): OutputOptions {
  return {
    format: 'esm',
    sourcemap,
    // emit absolute source paths, the way Metro does. a relative path is only
    // meaningful next to the map file, and neither /symbolicate nor a crash
    // reporter reading the shipped .map has that directory.
    sourcemapPathTransform: (relativeSourcePath, sourcemapPath) =>
      normalizePath(resolve(dirname(sourcemapPath), relativeSourcePath)),
    intro: prelude,
    codeSplitting: false,
    strictExecutionOrder: true,
    minify: minify || 'dce-only',
    // metro keeps each module's scope, so an unminified bundle keeps every
    // function and class name; hoisting renames colliding ones (`Foo` becomes
    // `Foo2`), which code reading `constructor.name` observes.
    keepNames: !minify,
  }
}

/**
 * Post-process a native bundle to fix rolldown devMode output quirks.
 * Most concerns have been moved to plugins/config:
 * - VXRN_REACT_19 → handled by define in getNativeTransformConfig
 * - DevSettings stripping → stripDevSettingsPlugin
 */
export function normalizeNativeCommonJSInterop(code: string): string {
  // native packages expose Babel defaults through exports.default. apply the
  // same interop to external bindings, bundled helpers and HMR export lookups.
  // parsed, not pattern-matched: bundle string data can hold the same
  // `__toESM(x, 1)` text, and only the parser knows a call from data.
  if (!code.includes('__toESM')) return code
  const { program, errors } = parseSync('native-bundle.js', code, { lang: 'js' })
  if (errors.length) {
    // stopping beats both alternatives: skipping leaves node-mode interop
    // across the whole bundle, and a regex fallback cannot tell data from a
    // call.
    throw new Error(
      `[vxrn] cannot normalize native CommonJS interop: the bundle does not parse (${errors[0].message})`
    )
  }
  // collect spans against the original bundle. copying the entire bundle for
  // each interop call creates gigabytes of temporary strings during a reload.
  const deletions: Array<[start: number, end: number]> = []
  const stack: unknown[] = [program]
  while (stack.length) {
    const node = stack.pop()
    if (Array.isArray(node)) {
      for (let index = node.length - 1; index >= 0; index--) {
        stack.push(node[index])
      }
      continue
    }
    if (!isInteropSyntaxNode(node)) continue
    if (node.type === 'CallExpression') {
      const span = interopNodeModeSpan(code, node)
      if (span) deletions.push(span)
    }
    for (const key of Object.keys(node)) {
      stack.push(node[key])
    }
  }
  if (!deletions.length) return code
  deletions.sort((a, b) => a[0] - b[0])
  const parts: string[] = []
  let copied = 0
  for (const [start, end] of deletions) {
    parts.push(code.slice(copied, start))
    copied = end
  }
  parts.push(code.slice(copied))
  return parts.join('')
}

interface InteropSyntaxNode {
  type: string
  start: number
  end: number
  [key: string]: any
}

function isInteropSyntaxNode(node: unknown): node is InteropSyntaxNode {
  if (!node || typeof node !== 'object') return false
  const candidate = node as { type?: unknown; start?: unknown; end?: unknown }
  return (
    typeof candidate.type === 'string' &&
    typeof candidate.start === 'number' &&
    typeof candidate.end === 'number'
  )
}

const NATIVE_INTEROP_HELPER = /^__toESM(?:\$\d+)?$/
const NATIVE_INTEROP_REQUIRE = /^require[\w$]*$/

// the `, 1` span of a rolldown node-mode `__toESM(first, 1)` call, or undefined
// for any other node. the first argument keeps the three generated shapes: a
// require call, an external binding, or an HMR export lookup.
function interopNodeModeSpan(
  code: string,
  node: InteropSyntaxNode
): [start: number, end: number] | undefined {
  const callee = node['callee']
  if (
    !isInteropSyntaxNode(callee) ||
    !isInteropHelperCallee(callee) ||
    node['optional'] === true
  ) {
    return undefined
  }
  const args = node['arguments']
  if (!Array.isArray(args) || args.length !== 2) return undefined
  const [first, second] = args
  if (!isInteropSyntaxNode(first) || !isInteropSyntaxNode(second)) return undefined
  if (!isInteropFirstArgument(first)) return undefined
  if (second.type !== 'Literal' || second['raw'] !== '1') return undefined
  // the comma may sit anywhere in the gap (`__toESM(x\n, 1)`), but nothing else
  // may: a comment or a trailing comma means generated code this pass does not
  // recognize, and unrecognized code is left alone.
  const between = code.slice(first.end, second.start)
  if (!/^\s*,\s*$/.test(between)) return undefined
  if (!/^\s*\)/.test(code.slice(second.end))) return undefined
  return [first.end + between.indexOf(','), second.end]
}

// the helper is a bare binding in full bundles and a runtime member on the
// HMR wire path (`__rolldown_runtime__.__toESM(...)`); a `.` sits on a word
// boundary, so the previous expression matched both shapes.
function isInteropHelperCallee(callee: InteropSyntaxNode): boolean {
  if (callee.type === 'Identifier') {
    return (
      typeof callee['name'] === 'string' &&
      NATIVE_INTEROP_HELPER.test(callee['name'])
    )
  }
  if (
    (callee.type === 'MemberExpression' ||
      callee.type === 'StaticMemberExpression') &&
    callee['computed'] !== true
  ) {
    const property = callee['property']
    return (
      isInteropSyntaxNode(property) &&
      property.type === 'Identifier' &&
      typeof property['name'] === 'string' &&
      NATIVE_INTEROP_HELPER.test(property['name'])
    )
  }
  return false
}

function isInteropFirstArgument(node: InteropSyntaxNode): boolean {
  if (node.type === 'Identifier') return true
  if (node.type !== 'CallExpression' || node['optional'] === true) return false
  const callee = node['callee']
  if (!isInteropSyntaxNode(callee)) return false
  const args = node['arguments']
  if (!Array.isArray(args)) return false
  if (callee.type === 'Identifier') {
    return (
      typeof callee['name'] === 'string' &&
      NATIVE_INTEROP_REQUIRE.test(callee['name']) &&
      args.length === 0
    )
  }
  if (
    (callee.type === 'MemberExpression' || callee.type === 'StaticMemberExpression') &&
    callee['computed'] !== true &&
    callee['optional'] !== true
  ) {
    const object = callee['object']
    const property = callee['property']
    return (
      isInteropSyntaxNode(object) &&
      object.type === 'Identifier' &&
      object['name'] === '__rolldown_runtime__' &&
      isInteropSyntaxNode(property) &&
      property.type === 'Identifier' &&
      property['name'] === 'loadExports' &&
      args.length === 1 &&
      isInteropSyntaxNode(args[0]) &&
      args[0].type === 'Literal' &&
      typeof args[0]['value'] === 'string'
    )
  }
  return false
}

/**
 * Every post-processing pass below rewrites the bundle after Rolldown has
 * already emitted its source map, so a pass that changes the number of lines
 * shifts every later frame away from the source it maps to. Replacing a removed
 * span with its own newlines keeps each surviving statement on the line the map
 * recorded for it.
 */
function blankPreservingLines(match: string): string {
  return '\n'.repeat(match.match(/\n/g)?.length ?? 0)
}

function countLines(code: string): number {
  return (code.match(/\n/g)?.length ?? 0) + 1
}

/**
 * Guard the source map's only invariant: application code has to stay on the
 * line Rolldown mapped it to. A pass that gains or loses a line is a bug in that
 * pass, and a symbolicated frame that silently points a few lines off is worse
 * than a build that stops and says so.
 */
function assertBundleLinesPreserved(before: string, after: string, stage: string): void {
  const beforeLines = countLines(before)
  const afterLines = countLines(after)
  if (beforeLines !== afterLines) {
    throw new Error(
      `[vxrn] native bundle post-processing (${stage}) changed the line count ` +
        `(${beforeLines} -> ${afterLines}), which invalidates the source map. ` +
        `Every pass after Rolldown emits the map must preserve lines.`
    )
  }
}

export function postProcessNativeBundle(code: string): string {
  code = normalizeNativeCommonJSInterop(code)

  // Rolldown replaces import.meta.env reads but can leave a guarding
  // `typeof import.meta` expression behind. Hermes rejects import.meta syntax
  // even when the other side of the condition has already folded to false.
  code = code.replace(/\btypeof\s+import\.meta\b/g, '"object"')

  // rolldown devMode still emits ESM export statements that hermes can't parse.
  // this is a rolldown behavior we can't configure away yet. both patterns match
  // horizontal whitespace only: a plain `\s` swallows the blank line above the
  // statement, and a swallowed line moves every frame below it.
  code = code.replace(
    /^[^\S\n]*export[^\S\n]*\{[^}]*\}[^\S\n]*;?[^\S\n]*$/gm,
    blankPreservingLines
  )
  code = code.replace(
    /^([^\S\n]*)export[^\S\n]+default[^\S\n]+([^;\n]+);?[^\S\n]*$/gm,
    '$1$2;'
  )
  // rolldown devMode runtime leaves some raw import.meta.hot references
  // that aren't compiled through the normal plugin pipeline.
  code = code.replace(/^if \(import\.meta\.hot\).*$/gm, '')

  // remove the stale NativeAnimatedModule IIFE wrapper from transform cache
  {
    const marker = 'NativeAnimatedModule_default ?? NativeAnimatedTurboModule_default;'
    const idx = code.indexOf(marker)
    if (idx !== -1) {
      const beforeMarker = code.lastIndexOf('NativeAnimatedModule = ', idx)
      if (beforeMarker !== -1) {
        const lineStart = code.lastIndexOf('\n', beforeMarker)
        const snippet = code.slice(lineStart + 1, beforeMarker + 50)
        if (snippet.includes('(function()') || snippet.includes('new Proxy')) {
          const afterMarker = code.indexOf('})();', idx)
          if (afterMarker !== -1) {
            const end = afterMarker + '})();'.length
            const removed = code.slice(beforeMarker, end)
            code =
              code.slice(0, beforeMarker) +
              'NativeAnimatedModule = NativeAnimatedModule_default ?? NativeAnimatedTurboModule_default;' +
              blankPreservingLines(removed) +
              code.slice(end)
          }
        }
      }
    }
  }

  return code
}

/**
 * wrap dev module declarations in a function scope. script-level declarations
 * create global properties that can block react native's lazy polyfills.
 * production uses rolldown's iife format; the dev engine needs this wrapper.
 *
 * keep the prelude at script scope because it installs intentional globals.
 * the dev runtime assigns itself to globalThis, and hmr's direct eval stays
 * inside this closure so it can reach module bindings and runtime helpers.
 */
export function wrapNativeBundleModuleScope(code: string): string {
  // the prelude (intro) ends right before the rolldown runtime region
  const marker = '//#region \\0rolldown/runtime.js'
  const idx = code.indexOf(marker)
  if (idx === -1) return code

  // the opener shares the marker's line (the rest of that line is a comment) so
  // the wrap costs no lines, and the closer only appends past the last mapped
  // line. the served bundle therefore stays aligned with Rolldown's source map.
  return code.slice(0, idx) + ';(function() {' + code.slice(idx) + '\n})();\n'
}

/**
 * Downlevel class fields in the rolldown runtime for Hermes compatibility.
 * The runtime (\0rolldown/runtime.js) is injected directly into the output,
 * bypassing hermesCompatSWCPlugin. We extract just that section (~5KB) and
 * transform it rather than re-parsing the entire 6MB bundle.
 */
async function downlevelClassFieldsInBundle(code: string): Promise<string> {
  const startMarker = '//#region \\0rolldown/runtime.js'
  const endMarker = '//#endregion'

  const startIdx = code.indexOf(startMarker)
  if (startIdx === -1) return code

  const endIdx = code.indexOf(endMarker, startIdx)
  if (endIdx === -1) return code

  const runtimeEnd = endIdx + endMarker.length
  const runtimeSection = code.slice(startIdx, runtimeEnd)
  const originalNewlines = runtimeSection.match(/\n/g)?.length ?? 0

  const { transformSync } = await import('oxc-transform')
  const result = transformSync('rolldown-runtime.js', runtimeSection, {
    target: 'es2020',
    assumptions: {
      setPublicClassFields: true,
    },
  })
  if (result.errors?.length) {
    throw new Error(result.errors.map((e) => e.message).join('\n'))
  }
  const transformedCode = result.code.trimEnd()
  // SWC minification strips comments, but the dev bundle scope wrapper uses
  // this generated-runtime marker as its structural boundary.
  const transformed = transformedCode.includes(startMarker)
    ? transformedCode
    : `${startMarker}\n${transformedCode}`
  const transformedNewlines = transformed.match(/\n/g)?.length ?? 0
  if (transformedNewlines > originalNewlines) {
    throw new Error(
      '[vxrn] Hermes runtime transform added lines and would invalidate the production source map'
    )
  }
  const linePreservingRuntime =
    transformed + '\n'.repeat(originalNewlines - transformedNewlines)
  return code.slice(0, startIdx) + linePreservingRuntime + code.slice(runtimeEnd)
}

/**
 * Run the native post-processing passes inside the bundle, where rolldown still
 * hands them unminified output.
 *
 * Rolldown minifies a chunk *after* plugin `renderChunk` hooks, and every pass
 * below reads the shape rolldown generates: `normalizeNativeCommonJSInterop`
 * matches `__toESM(require_x(), 1)` by name, and `downlevelClassFieldsInBundle`
 * locates the runtime by its `//#region` comment. Minification mangles the
 * first and strips the second, so running these on the finished chunk would
 * silently stop applying them as soon as `--minify` is on — a production bundle
 * whose CommonJS interop differs from the dev one. This hook is what keeps a
 * minified and an unminified bundle the same bundle.
 *
 * `map: null` records what the passes guarantee: they replace syntax in place
 * without moving a line, so rolldown's own map still describes the result.
 */
function nativeBundlePostProcessPlugin(): Plugin {
  return {
    name: 'vxrn:native-post-process',
    async renderChunk(code) {
      const processed = await downlevelClassFieldsInBundle(postProcessNativeBundle(code))
      assertBundleLinesPreserved(code, processed, 'production')
      return { code: processed, map: null }
    },
  }
}

export async function createNativeDevEngine(
  options: NativeDevEngineOptions
): Promise<NativeDevEngineResult> {
  const {
    root,
    port,
    host = 'localhost',
    platform,
    serverUrl,
    plugins: userPlugins = [],
    onHmrUpdate,
  } = options

  const { dev, viteImportGlobPlugin } = await import('rolldown/experimental')

  const hmrRuntimeSource = getHmrRuntimeSource()

  const prelude = getNativePrelude({
    dev: true,
    platform,
    serverUrl: serverUrl || `http://${host}:${port}`,
  })
  const assetRegistry = createNativeDevAssetRegistry()

  let currentBundle: NativeDevBundle | null = null
  let firstBuildError: Error | null = null
  let bundleResolve: ((value: NativeDevBundle) => void) | null = null
  let bundleReject: ((error: Error) => void) | null = null
  let bundlePromise: Promise<NativeDevBundle> | null = null

  const virtualEntry = nativeVirtualEntryPlugin(root, {
    dev: true,
    platform,
    dynamicRoutes: true,
  })

  // one build at a time: a bundle request and a full rebuild can arrive
  // together (a reload lands on the bundle route while a new route file is
  // being picked up), and the engine holds a single output the second would
  // race the first for.
  let engineWork: Promise<unknown> = Promise.resolve()
  const queueEngineWork = <T>(work: () => Promise<T>): Promise<T> => {
    const result = engineWork.then(work, work)
    engineWork = result.catch(() => {})
    return result
  }

  const inputOptions: InputOptions = {
    input: VIRTUAL_NATIVE_ENTRY,
    cwd: root,
    platform: 'neutral',
    resolve: getNativeResolveConfig(platform),
    transform: getNativeTransformConfig(platform, true, root),

    experimental: {
      devMode: { implement: hmrRuntimeSource, host, port },
      incrementalBuild: true,
      // lazyBarrel defers barrel re-export initialization — needed in dev mode
      // to avoid breaking worklet closure serialization order.
      // removed from prod builds (buildNativeBundle) where it caused build errors.
      lazyBarrel: true,
    },

    treeshake: false,
    // some react-native ecosystem packages import symbols that don't exist in
    // the declared entry (e.g. @react-navigation/elements imports NavigationProvider
    // from @react-navigation/native which doesn't export it). metro silently shims
    // these — rolldown needs an explicit opt-in.
    shimMissingExports: true,

    moduleTypes: {
      '.js': 'jsx',
    },

    plugins: [
      virtualEntry.plugin,
      ...getNativePlugins(
        root,
        platform,
        viteImportGlobPlugin,
        true,
        undefined,
        assetRegistry.register,
        // per-module maps: without them a module's transform output has no path
        // back to its authored file, and /symbolicate can only report the
        // bundle offset it was handed.
        true,
        userPlugins
      ),
    ],
  }

  const outputOptions: OutputOptions = {
    // the dev map is what /symbolicate resolves a device frame through. it is
    // generated once per full bundle build, not per edit: rebuildStrategy is
    // 'never', so Fast Refresh patches never re-enter this path. a dev bundle
    // is never minified.
    ...getNativeOutputOptions(prelude, true, false),
    // open the HMR socket with RN's WebSocket module (not the global, which is
    // only polyfilled once setup-env has run) and hand it to the runtime,
    // which owns every message it carries. handed over immediately rather than
    // from an open handler: a host that does not honor `socket.onopen = fn`
    // would otherwise silently never get Fast Refresh. the socket goes to the
    // origin the device loaded this bundle from (RN's getDevServer), never the
    // server's own host:port: an emulator behind `adb reverse tcp:8081 tcp:<port>`
    // or a phone on the LAN cannot reach the server's localhost:<port>.
    outro: `
try {
  var __WS = (init_WebSocket(), __toCommonJS(WebSocket_exports)).default;
  var __devServer = (init_getDevServer(), __toCommonJS(getDevServer_exports)).default();
  var __hmrUrl = __devServer.url.replace(/^http/, 'ws') + 'hot?platform=${platform}&clientId=' + encodeURIComponent(__rolldown_runtime__.clientId);
  __rolldown_runtime__.setup(new __WS(__hmrUrl));
} catch(e) {
  // a swallowed failure here leaves the app permanently without Fast Refresh and
  // nothing on screen or in the terminal says so.
  console.error('[vxrn] HMR client failed to start:', (e && e.message) || e);
}
`,
  }

  // rolldown does not await this callback, so `ensureLatestBuildOutput()`
  // resolves while the emitted chunk is still being post-processed and
  // `currentBundle` still holds the previous build. anything that has to see
  // the finished bundle waits on this too.
  let outputProcessed: Promise<void> = Promise.resolve()

  let engine: Awaited<ReturnType<typeof dev>>
  let routeWatcher: FSWatcher | undefined

  const rebuildIfRouteGraphChanged = (): Promise<boolean> =>
    queueEngineWork(async () => {
      // decide from the complete route set after all earlier engine work. a
      // watcher can report a directory, a rename, or several events for one
      // write, and none of those event shapes are the source of truth.
      const { files: knownRoutes, scanFiles, updateFiles } = virtualEntry.routes
      const currentRoutes = scanFiles()
      const routeSetChanged =
        currentRoutes.size !== knownRoutes.size ||
        [...currentRoutes].some((route) => !knownRoutes.has(route))
      if (!routeSetChanged) return false

      // changing this small imported module lets Rolldown compile only the new
      // route and the registry delta. rebuilding a multi-megabyte native bundle
      // makes route creation scale with the entire app.
      updateFiles(currentRoutes)
      return true
    })

  engine = await dev(inputOptions, outputOptions, {
    onOutput: async (result) => {
      let finishOutput = () => {}
      outputProcessed = new Promise<void>((resolve) => {
        finishOutput = resolve
      })
      try {
        await handleOutput(result)
      } finally {
        finishOutput()
      }
    },

    onHmrUpdates: async (result) => {
      // wait for rolldown's BundleCompleted handler (which tears down and
      // recreates the macOS fsevent stream on path updates) to finish before
      // touching the route file or notifying clients, so a follow-up edit
      // triggered by the HMR message cannot land while the watcher is stopped.
      await engine?.ensureCurrentBuildFinish()

      // adding or deleting a route changes a route map that was expanded when
      // the entry transformed. only a full build re-expands it, and rolldown
      // tells no client that happened, so the reload is sent from here. this
      // comes first: a deleted route fails its own patch while the registry
      // still imports it, and the registry update supersedes that failure.
      if (await rebuildIfRouteGraphChanged()) return

      if (result instanceof Error) {
        // an import of a route that an earlier registry listed and the current
        // one dropped is a deleted route the registry was already rewritten for,
        // and that rewrite builds and reports again.
        const { removedFiles, registryId } = virtualEntry.routes
        const errors: Array<{ code?: string; id?: string; exporter?: string }> =
          (result as any).errors ?? []
        if (
          registryId &&
          errors.length &&
          errors.every((e) => {
            if (e.code !== 'UNRESOLVED_IMPORT' || e.id !== registryId || !e.exporter) {
              return false
            }
            const file = normalizePath(resolve(dirname(e.id), e.exporter))
            return removedFiles.has(file)
          })
        ) {
          return
        }
        console.error('[vxrn] HMR error:', result.message)
        onHmrUpdate?.({ type: 'hmr:error' })
        return
      }

      for (const { clientId, update } of result.updates) {
        if (update.type === 'Patch' && update.code) {
          await engine.notifyPayloadDelivered(update.filename)
          onHmrUpdate?.({
            type: 'hmr:update',
            clientId,
            code: normalizeNativeCommonJSInterop(update.code),
            changedIds: update.changedIds,
            seq: update.seq,
          })
        } else if (update.type === 'FullReload') {
          onHmrUpdate?.({ type: 'hmr:reload', clientId })
        }
      }
    },

    // patches update the registered client runtime directly. a full bundle rebuild
    // is only needed when the runtime requests a reload.
    rebuildStrategy: 'never',
    watch: {
      exclude: ['**/node_modules/.test/**', '**/.git/**'],
    },
  })

  async function handleOutput(result: RolldownOutput | Error) {
    if (result instanceof Error) {
      console.error('[vxrn] native bundle error:', result.message)
      if (/panic/i.test(result.message)) {
        // a panicked rolldown worker stops producing HMR patches for the rest
        // of the process, so every later edit reloads the whole app. nothing
        // else says so, and the app looks fine.
        console.error(
          '[vxrn] rolldown itself panicked. Fast Refresh will full-reload until you restart the dev server.'
        )
      }
      if (!currentBundle) {
        firstBuildError ||= result
        if (bundleReject) {
          const reject = bundleReject
          bundleResolve = null
          bundleReject = null
          bundlePromise = null
          reject(firstBuildError)
        }
      }
      return
    }

    const output = result as RolldownOutput
    const chunk = output.output.find((o) => o.type === 'chunk' && o.isEntry)
    if (chunk && 'code' in chunk) {
      firstBuildError = null
      let code: string
      try {
        code = postProcessNativeBundle(chunk.code)

        // downlevel class fields from the rolldown runtime (virtual module
        // skipped by the per-file SWC plugin) so old Hermes can parse them
        code = await downlevelClassFieldsInBundle(code)
        assertBundleLinesPreserved(chunk.code, code, 'dev')
      } catch (error) {
        // a post-processing failure is a build failure: without a bundle to
        // serve, record it and wake the waiting request with its message
        // instead of leaving it on the generic timeout. past a first good
        // build the last bundle keeps serving, like the rolldown-error
        // branch: one bad output must not poison later builds.
        const failure = error instanceof Error ? error : new Error(String(error))
        console.error('[vxrn] native bundle post-processing failed:', failure.message)
        if (!currentBundle) {
          firstBuildError = failure
          if (bundleReject) {
            const reject = bundleReject
            bundleResolve = null
            bundleReject = null
            bundlePromise = null
            reject(failure)
          }
        }
        return
      }

      // wrap module code in a function scope so top-level `var`s (e.g. RN
      // fetch.js's `Headers`/`Request`) don't leak as non-configurable
      // globals and break RN's polyfillGlobal (dev-only redbox). see fn doc.
      // it only appends past the last mapped line, so it needs no assertion.
      code = wrapNativeBundleModuleScope(code)

      if (!chunk.map) {
        throw new Error(
          '[vxrn] rolldown produced no source map for the dev bundle, so /symbolicate cannot resolve a frame'
        )
      }
      // hold the serialized map, not a parsed one: parsing a map for a bundle
      // this size costs hundreds of megabytes that would stay resident for the
      // life of the dev server, and /symbolicate runs only when a frame needs
      // resolving.
      currentBundle = { code, map: chunk.map.toString() }
      console.info(`[vxrn] native bundle ready (${Math.round(code.length / 1024)}KB)`)
      if (bundleResolve) {
        bundleResolve(currentBundle)
        bundleResolve = null
        bundleReject = null
        bundlePromise = null
      }
    }
  }

  await engine.run()

  // import.meta.glob records the files it matched, not the directory whose
  // membership defines the route map. own that directory watch next to the
  // engine and compare complete route sets on every event. this also covers a
  // router root created after the dev server starts.
  let routeWatchTarget = virtualEntry.routes.routeRoot
  while (!statSync(routeWatchTarget, { throwIfNoEntry: false })?.isDirectory()) {
    const parent = dirname(routeWatchTarget)
    if (parent === routeWatchTarget) break
    routeWatchTarget = parent
  }
  const normalizedRouteRoot = normalizePath(virtualEntry.routes.routeRoot)
  routeWatcher = watch(routeWatchTarget, { recursive: true }, (_eventType, file) => {
    if (file === null) return
    const changed = normalizePath(resolve(routeWatchTarget, file.toString()))
    if (
      changed !== normalizedRouteRoot &&
      !changed.startsWith(`${normalizedRouteRoot}/`)
    ) {
      return
    }
    rebuildIfRouteGraphChanged().catch((error) => {
      console.error(`[vxrn] rebuilding the native route map failed`, error)
    })
  })
  routeWatcher.on('error', (error) => {
    console.error(`[vxrn] watching the native route map failed`, error)
  })
  await rebuildIfRouteGraphChanged()

  const getBundle = async (): Promise<NativeDevBundle> => {
    // a runtime invalidation marks the full output stale before reloading. pull
    // that output before serving the cached bundle to the restarted app.
    await queueEngineWork(async () => {
      await engine.ensureLatestBuildOutput()
      await outputProcessed
    })
    if (currentBundle) return currentBundle
    if (firstBuildError) throw firstBuildError
    if (!bundlePromise) {
      let timeoutId: ReturnType<typeof setTimeout>
      bundlePromise = new Promise((resolve, reject) => {
        bundleResolve = (value) => {
          clearTimeout(timeoutId)
          resolve(value)
        }
        bundleReject = (error) => {
          clearTimeout(timeoutId)
          reject(error)
        }
        timeoutId = setTimeout(() => {
          bundleResolve = null
          bundleReject = null
          bundlePromise = null
          reject(new Error('[vxrn] bundle build timed out after 120s'))
        }, 120_000)
      })
    }
    return bundlePromise
  }

  return {
    engine,

    getBundle,

    async getSourceMap() {
      // resolve frames against the map of the bundle currently running on the
      // device. every Fast Refresh patch marks rolldown's full output stale, so
      // calling ensureLatestBuildOutput() here would kick off a full bundle
      // rebuild that blocks WatchEvent HMR tasks and replaces the map before
      // the device has reloaded.
      await outputProcessed
      if (currentBundle) return currentBundle.map
      return (await getBundle()).map
    },

    getAsset(pathname, hash) {
      return assetRegistry.resolve(pathname, hash)
    },

    async close() {
      routeWatcher?.close()
      await engine.close()
    },
  }
}

// --- production build ---

interface NativeBuildOptions {
  root: string
  platform: NativePlatform
  dev?: boolean
  serverUrl?: string
  entryFile?: string
  assetsDest?: string
  plugins?: Plugin[]
  /** only pass when the map is written somewhere — it costs a second copy of the bundle */
  sourcemap?: boolean
  /**
   * Compress and mangle the output. Defaults to React Native's own rule for a
   * bundle: on unless the build is a dev build.
   */
  minify?: boolean
}

export async function buildNativeBundle(
  options: NativeBuildOptions
): Promise<{ code: string; map?: string }> {
  const {
    root,
    platform,
    dev = false,
    serverUrl,
    entryFile,
    assetsDest,
    plugins: userPlugins = [],
    sourcemap = false,
    minify = !dev,
  } = options

  const { build } = await import('rolldown')
  const { viteImportGlobPlugin } = await import('rolldown/experimental')

  const prelude = getNativePrelude({
    dev,
    platform,
    serverUrl,
  })
  const buildEntry = entryFile
    ? normalizePath(resolve(root, entryFile))
    : VIRTUAL_NATIVE_ENTRY

  const result = await build({
    input: buildEntry,
    cwd: root,
    platform: 'neutral',
    resolve: getNativeResolveConfig(platform),
    transform: getNativeTransformConfig(platform, dev, root),
    treeshake: !dev,
    experimental: {
      // rolldown 1.1.0 flipped lazyBarrel to default-on. pin it off so the prod
      // bundle keeps the pre-1.1 semantics it shipped with (prod historically ran
      // with lazyBarrel off — see dev-mode note above). turning it on in prod is a
      // separate, runtime-validated change, not something to adopt implicitly via
      // a default flip during a version bump.
      lazyBarrel: false,
    },
    shimMissingExports: true,
    moduleTypes: { '.js': 'jsx' },
    plugins: [
      ...(entryFile ? [] : [nativeVirtualEntryPlugin(root, { dev, platform }).plugin]),
      ...getNativePlugins(
        root,
        platform,
        viteImportGlobPlugin,
        dev,
        assetsDest,
        undefined,
        sourcemap,
        userPlugins,
        minify
      ),
      // last, so it sees what every other plugin produced
      nativeBundlePostProcessPlugin(),
    ],
    output: {
      ...getNativeOutputOptions(prelude, sourcemap, minify),
      // native hosts evaluate a script; module bindings must stay out of globals.
      format: 'iife',
    },
  })
  const chunk = result.output.find((o) => o.type === 'chunk' && o.isEntry)

  if (!chunk || !('code' in chunk)) {
    throw new Error('[vxrn] production build produced no output')
  }

  if (sourcemap && !chunk.map) {
    throw new Error(
      '[vxrn] a source map was requested but rolldown produced none for the production bundle'
    )
  }
  // Per-module Babel/SWC transforms return maps when requested, and
  // nativeBundlePostProcessPlugin runs inside the bundle, so Rolldown's map
  // already describes the emitted chunk and composes back to original source.
  return {
    code: chunk.code,
    map: sourcemap ? chunk.map?.toString() : undefined,
  }
}

const VIRTUAL_NATIVE_ENTRY = 'virtual:native-entry'

/**
 * The route files the last build expanded `import.meta.glob` over. rolldown's
 * dev engine reports a change to a watched file it holds no module for, but in
 * devMode it never re-scans, so this is what tells a created route apart from
 * an edit to one that already exists.
 */
interface NativeRouteRegistry {
  routeRoot: string
  files: Set<string>
  isRouteFile: (file: string) => boolean
  scanFiles: () => Set<string>
  updateFiles: (files: Set<string>) => void
  // the registry module's resolved id, as rolldown reports it in errors
  registryId?: string
  // routes an earlier registry listed that the current one does not
  removedFiles: Set<string>
}

function nativeVirtualEntryPlugin(
  root: string,
  opts: {
    dev?: boolean
    platform: NativePlatform
    dynamicRoutes?: boolean
  }
): { plugin: Plugin; routes: NativeRouteRegistry } {
  const isDev = opts?.dev !== false
  const useDynamicRouteRegistry = opts.dynamicRoutes === true
  // absolute for import.meta.glob resolution; forward-slash for module-graph convention
  const resolvedId = normalizePath(resolve(root, '__virtual-native-entry.tsx'))

  // read config passed from One's vite plugin via globalThis
  const entryConfig = (globalThis as any).__vxrnNativeEntryConfig || {}
  const routerRoot = entryConfig.routerRoot || 'app'
  const flags = entryConfig.flags || {}
  const linking = entryConfig.linking

  // build setupFile import (static import for native)
  const setupFileImport = (() => {
    const sf = entryConfig.setupFile
    if (!sf) return ''
    // string and native apply to every native platform. macos does not borrow the ios file.
    const perPlatform = sf as { ios?: string; android?: string; macos?: string }
    const file =
      typeof sf === 'string'
        ? sf
        : 'native' in sf
          ? sf.native
          : opts.platform === 'macos'
            ? perPlatform.macos
            : sf.ios
    if (!file) return ''
    // file:// URL is the canonical specifier; bare Windows absolute path is not
    const resolved = pathToFileURL(resolve(root, file)).href
    return `import ${JSON.stringify(resolved)};`
  })()

  // build glob patterns matching One's virtualEntryPlugin
  // platform-specific files (.native/.ios/.android) must be included so getRoutes()
  // can score them by specificity and pick the right variant per platform
  const routeGlobs = [
    `./${routerRoot}/**/*.tsx`,
    `./${routerRoot}/**/*.ts`,
    `!./${routerRoot}/**/*+api.*`,
    `!./${routerRoot}/**/*.test.*`,
    `!./${routerRoot}/**/*.d.ts`,
    `!./${routerRoot}/**/*.server.*`,
    `!./${routerRoot}/**/_middleware.*`,
    `!./${routerRoot}/**/*.web.*`,
    // ignoredRouteFiles from One's router config
    ...(entryConfig.ignoredRouteFiles || []).map(
      (pattern: string) => `!./${routerRoot}/${pattern}`
    ),
  ]

  const refreshSetup = isDev
    ? `
// react-refresh/runtime MUST initialize before React loads
import RefreshRuntime from 'react-refresh/runtime';
RefreshRuntime.injectIntoGlobalHook(globalThis);
globalThis.__ReactRefresh = RefreshRuntime;
globalThis.$RefreshReg$ = function(type, id) {
  RefreshRuntime.register(type, id);
};
globalThis.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
`
    : ''

  const entryCode = () => `
${refreshSetup}
// retain the namespace so rolldown dev eagerly initializes the RN environment
// before app modules, even when the renderer also requires this entry.
import * as ReactNativeEnvironment from 'react-native/setup-env';
import NativeWebSocket from 'react-native/Libraries/WebSocket/WebSocket';
import DevSettings from 'react-native/Libraries/Utilities/DevSettings';
${setupFileImport}
${routeImports}
import { createApp } from 'one';

void ReactNativeEnvironment;
globalThis.WebSocket = NativeWebSocket;
globalThis.__VXRN_RELOAD_NATIVE_DEV_BUNDLE__ = function(reason) {
  DevSettings.reload(reason);
};

// React Native reloads a dev bundle in the existing JS runtime. Advance One's
// route-cache version so a full reload cannot reuse the previous context.
globalThis.__vxrnVersion = (globalThis.__vxrnVersion || 0) + 1;

createApp({
  routes: routes,
  routerRoot: ${JSON.stringify(routerRoot)},
  flags: ${JSON.stringify(flags)},
  linking: ${JSON.stringify(linking)},
});

${routeHmr}
`

  const routeRoot = resolve(root, routerRoot)
  // the entry's globs are written for `import.meta.glob`, which reads a leading
  // `!` as an exclusion and a leading `./` as the project root. micromatch
  // reads neither: `!p` matches everything except p, so a negation would match
  // every ordinary file, and `./app/x` never matches `./app/**`. split the
  // exclusions out and drop the `./` from both sides to keep the same meaning.
  const stripDot = (pattern: string) => pattern.replace(/^\.\//, '')
  const includeGlobs = routeGlobs.filter((p) => !p.startsWith('!')).map(stripDot)
  const excludeGlobs = routeGlobs
    .filter((p) => p.startsWith('!'))
    .map((p) => stripDot(p.slice(1)))
  const isRouteFile = (file: string) => {
    const relativeToRoot = normalizePath(relative(root, file))
    return (
      micromatch.isMatch(relativeToRoot, includeGlobs) &&
      !micromatch.isMatch(relativeToRoot, excludeGlobs)
    )
  }
  const scanFiles = () => {
    const files = new Set<string>()
    const walkRouteRoot = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const child = resolve(dir, entry.name)
        if (entry.isDirectory()) walkRouteRoot(child)
        else if (isRouteFile(child)) files.add(normalizePath(child))
      }
    }
    if (statSync(routeRoot, { throwIfNoEntry: false })?.isDirectory()) {
      walkRouteRoot(routeRoot)
    }
    return files
  }
  const registrySpecifier = `./node_modules/.vxrn/native-routes-${opts.platform}.mjs`
  const registryPath = resolve(root, registrySpecifier)
  const routes: NativeRouteRegistry = {
    routeRoot,
    files: new Set(),
    removedFiles: new Set(),
    isRouteFile,
    scanFiles,
    updateFiles(files) {
      for (const file of routes.files) if (!files.has(file)) routes.removedFiles.add(file)
      for (const file of files) routes.removedFiles.delete(file)
      routes.files = files
      if (!useDynamicRouteRegistry) return

      mkdirSync(dirname(registryPath), { recursive: true })
      // rolldown resolves the registry through symlinked node_modules before its imports.
      const registryDir = realpathSync(dirname(registryPath))
      routes.registryId = join(registryDir, basename(registryPath))
      const source = `export const routes = {\n${[...files]
        .sort()
        .map((file) => {
          const routeKey = `/${normalizePath(relative(root, file))}`
          let importPath = normalizePath(relative(registryDir, file))
          if (!importPath.startsWith('.')) importPath = `./${importPath}`
          return `  ${JSON.stringify(routeKey)}: () => import(${JSON.stringify(importPath)})`
        })
        .join(',\n')}\n}\n`
      if (!existsSync(registryPath) || readFileSync(registryPath, 'utf8') !== source) {
        writeFileSync(registryPath, source)
      }
    },
  }
  routes.updateFiles(routes.scanFiles())

  const routeImports = useDynamicRouteRegistry
    ? `import { routes } from ${JSON.stringify(registrySpecifier)};`
    : `var _routes = import.meta.glob(${JSON.stringify(routeGlobs)}, { exhaustive: true });
// fix route keys: One expects '/${routerRoot}/...' prefix but import.meta.glob returns './${routerRoot}/...'
var routes = {};
Object.keys(_routes).forEach(function(key) {
  var normalizedKey = key.replace(/^\\.\\//, '');
  routes['/' + normalizedKey] = _routes[key];
});`
  const routeHmr = useDynamicRouteRegistry
    ? `if (import.meta.hot) {
  import.meta.hot.accept(${JSON.stringify(registrySpecifier)}, function(next) {
    if (globalThis.__VXRN_UPDATE_NATIVE_ROUTES__) {
      globalThis.__VXRN_UPDATE_NATIVE_ROUTES__(next.routes);
    }
  });
}`
    : ''

  return {
    routes,
    plugin: {
      name: 'vxrn:native-virtual-entry',
      resolveId(id) {
        if (id === VIRTUAL_NATIVE_ENTRY) {
          return resolvedId
        }
      },
      load(id) {
        if (id !== resolvedId) return
        return entryCode()
      },
    },
  }
}

// --- plugins ---

/**
 * Guard NativeAnimatedHelper's createNativeOperations against undefined methods.
 * The methodNames array includes "removeListener" (singular) but the TurboModule
 * spec only has "removeListeners" (plural). The closure calls
 * nullthrows(NativeAnimatedModule)[methodName] which returns undefined, then
 * method(...args) throws "undefined is not a function".
 */
export function nativeAnimatedGuardPlugin(): Plugin {
  return {
    name: 'vxrn:native-animated-guard',
    transform(code, id) {
      if (!id.includes('animated/NativeAnimatedHelper')) return
      const target = 'const method = nullthrows(NativeAnimatedModule)[methodName];'
      if (!code.includes(target)) return
      const transformed = code.replace(
        target,
        `${target} if (typeof method !== 'function') return;`
      )
      return {
        code: transformed,
        // this transform deliberately preserves line count. Give Rolldown a
        // line-identity map so it can compose the earlier compiler map instead
        // of dropping source-map coverage for this module.
        map: {
          version: 3,
          sources: [id],
          sourcesContent: [code],
          names: [],
          mappings: code
            .split('\n')
            .map((_, index) => (index === 0 ? 'AAAA' : 'AACA'))
            .join(';'),
        },
      }
    },
  }
}

/**
 * Block .server.* and _middleware.* files from entering the native bundle.
 * These are server-only code paths that should never ship to the client.
 */
function serverFileExclusionPlugin(): Plugin {
  return {
    name: 'vxrn:server-file-exclusion',
    load(id) {
      if (/\.server\.\w+$/.test(id)) {
        return { code: 'export default undefined;', moduleType: 'js' as any }
      }
      if (/[\\/]_middleware\.\w+$/.test(id)) {
        return { code: 'export default undefined;', moduleType: 'js' as any }
      }
    },
  }
}

/**
 * An `import()` of a package that is not installed stays a raw dynamic import
 * in the bundle, which Hermes cannot parse. Metro resolves it as an optional
 * dependency: the import rejects with "Cannot find module" when it runs. Do the
 * same, so a library that probes an optional peer (`await import('x')` inside
 * try) builds and falls back at runtime.
 */
function missingDynamicImportPlugin(): Plugin {
  const PREFIX = '\0vxrn-missing-module:'
  return {
    name: 'vxrn:missing-dynamic-import',
    async resolveId(source, importer, options) {
      if (options.kind !== 'dynamic-import') return
      if (source.startsWith('.') || source.startsWith('/') || source.includes(':')) return
      if (source.startsWith('\0')) return
      const resolved = await this.resolve(source, importer, {
        skipSelf: true,
        kind: options.kind,
      })
      if (resolved) return resolved
      return { id: `${PREFIX}${source}`, external: false }
    },
    load(id) {
      if (!id.startsWith(PREFIX)) return
      const source = JSON.stringify(`Cannot find module '${id.slice(PREFIX.length)}'`)
      return { code: `throw new Error(${source});`, moduleType: 'js' as any }
    },
  }
}

/**
 * Guard environment-specific bare imports in native bundles.
 * - server-only, client-only, web-only → throw at runtime
 * - native-only → no-op (we ARE native)
 */
function environmentGuardPlugin(): Plugin {
  const THROWING = ['server-only', 'client-only', 'web-only']
  const NOOP = ['native-only']
  return {
    name: 'vxrn:environment-guard',
    resolveId(source) {
      if (THROWING.includes(source))
        return { id: `\0env-guard-throw:${source}`, external: false }
      if (NOOP.includes(source))
        return { id: `\0env-guard-noop:${source}`, external: false }
    },
    load(id) {
      if (id.startsWith('\0env-guard-throw:')) {
        const pkg = id.slice('\0env-guard-throw:'.length)
        return {
          code: `throw new Error("Cannot import '${pkg}' in a native bundle.");`,
          moduleType: 'js' as any,
        }
      }
      if (id.startsWith('\0env-guard-noop:')) return { code: '', moduleType: 'js' as any }
    },
  }
}

/**
 * alias react-native's Metro HMR client (`Libraries/Utilities/HMRClient`) to a
 * no-op module.
 *
 * vxrn drives Fast Refresh itself over the rolldown-runtime WebSocket and never
 * speaks Metro's `/hot` protocol. On the new architecture, react-native
 * `registerCallableModule('HMRClient', require('./HMRClient'))`s its real client
 * eagerly at startup before vxrn's late override runs, and `emplace` keeps
 * that first registration. RN's client then opens a `MetroHMRClient` socket that
 * receives vxrn's `hmr:*` frames it can't parse and red-boxes
 * `unknown-message [object Object]` on every edit.
 *
 * neutralizing the module at its source means RN registers *this* no-op as the
 * one-and-only `HMRClient` (working with `emplace`, so it's arch-agnostic) and
 * the stray socket is never opened. The class-shaped surface
 * (`setup`/`enable`/`disable`/`registerBundle`/`log`/`isEnabled`) mirrors the
 * methods RN calls on it.
 */
export function hmrClientNoopPlugin(): Plugin {
  // match RN's HMRClient by module path, tolerating either separator (native
  // Windows ids use `\`) and an optional js/ts extension
  const RN_HMR_CLIENT_RE = /(^|[\\/])Utilities[\\/]HMRClient(\.[cm]?[jt]sx?)?$/
  return {
    name: 'vxrn:hmr-client-noop',
    resolveId(source, importer) {
      const fromReactNative =
        source.startsWith('react-native/') ||
        (importer != null && /(^|[\\/])react-native[\\/]/.test(importer))
      if (fromReactNative && RN_HMR_CLIENT_RE.test(source)) {
        return { id: '\0vxrn-hmr-client-noop', external: false }
      }
    },
    load(id) {
      if (id === '\0vxrn-hmr-client-noop') {
        return {
          code: `const HMRClient = { setup() {}, enable() {}, disable() {}, registerBundle() {}, log() {}, isEnabled() { return false } }\nexport default HMRClient`,
          moduleType: 'js',
        }
      }
    },
  }
}

function nativeIdentityAliasPlugin(platform: NativePlatform): Plugin {
  const packages = new Map<
    string,
    { root: string; aliases: Record<string, unknown> } | null
  >()
  let resolver: import('rolldown/experimental').ResolverFactory | undefined
  const findPackage = (
    directory: string
  ): { root: string; aliases: Record<string, unknown> } | null => {
    if (packages.has(directory)) return packages.get(directory)!
    let result: { root: string; aliases: Record<string, unknown> } | null = null
    const manifest = join(directory, 'package.json')
    if (existsSync(manifest)) {
      try {
        const field = JSON.parse(readFileSync(manifest, 'utf8'))['react-native']
        result = {
          root: directory,
          aliases: field && typeof field === 'object' ? field : {},
        }
      } catch {}
    } else {
      const parent = dirname(directory)
      if (parent !== directory) result = findPackage(parent)
    }
    packages.set(directory, result)
    return result
  }
  return {
    name: 'vxrn:native-identity-alias',
    async resolveId(source, importer) {
      if (!importer || !source.startsWith('.')) return
      const pkg = findPackage(dirname(importer))
      if (!pkg) return
      const key = `./${normalizePath(relative(pkg.root, resolve(dirname(importer), source)))}`
      if (pkg.aliases[key] !== key) return
      // A native identity mapping deliberately keeps the original implementation
      // even when the browser field maps it elsewhere. Avoid alias recursion.
      if (!resolver) {
        const { ResolverFactory } = await import('rolldown/experimental')
        resolver = new ResolverFactory({
          ...getNativeResolveConfig(platform),
          aliasFields: [],
        })
      }
      const result = resolver.sync(dirname(importer), source)
      if (result.path) return result.path
    },
  }
}

// export maps resolve in key order, so a package listing `browser` before
// `react-native` would give native its web build. the browser fallback is for
// packages without a native target: where a package's exports name both,
// resolve it as metro does, without `browser`.
function nativeExportsPrecedencePlugin(
  root: string,
  platform: NativePlatform
): Plugin {
  const manifests = new Map<string, { name?: string; exports?: unknown } | null>()
  const readManifest = (directory: string) => {
    if (!manifests.has(directory)) {
      let manifest = null
      try {
        manifest = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'))
      } catch {}
      manifests.set(directory, manifest)
    }
    return manifests.get(directory)
  }
  const resolvers = new Map<string, import('rolldown/experimental').ResolverFactory>()
  return {
    name: 'vxrn:native-exports-precedence',
    async resolveId(source, importer, options) {
      if (source.startsWith('.') || source.startsWith('/') || source.includes(':')) return
      const resolved = await this.resolve(source, importer, {
        skipSelf: true,
        kind: options.kind,
      })
      if (!resolved || resolved.external || resolved.id.startsWith('\0')) return resolved
      const name = source
        .split('/')
        .slice(0, source.startsWith('@') ? 2 : 1)
        .join('/')
      let directory = dirname(resolved.id)
      while (readManifest(directory)?.name !== name) {
        if (dirname(directory) === directory) return resolved
        directory = dirname(directory)
      }
      const exportsMap = JSON.stringify(readManifest(directory)?.exports ?? null)
      if (!exportsMap.includes('"react-native"') || !exportsMap.includes('"browser"')) {
        return resolved
      }
      const kind = options.kind === 'require-call' ? 'require' : 'import'
      let resolver = resolvers.get(kind)
      if (!resolver) {
        const { ResolverFactory } = await import('rolldown/experimental')
        resolver = new ResolverFactory({
          ...getNativeResolveConfig(platform),
          conditionNames: ['react-native', kind, 'default'],
        })
        resolvers.set(kind, resolver)
      }
      const native = resolver.sync(importer ? dirname(importer) : root, source)
      if (!native.path || native.path === resolved.id) return resolved
      return this.resolve(native.path, importer, { skipSelf: true, kind: options.kind })
    },
  }
}

function nativeDeclarationAliasPlugin(root: string, platform: NativePlatform): Plugin {
  const resolvers = new Map<string, import('rolldown/experimental').ResolverFactory>()
  return {
    name: 'vxrn:declaration-alias',
    async resolveId(source, importer, options) {
      if (source.startsWith('.') || source.startsWith('/') || source.includes(':')) return
      const resolved = await this.resolve(source, importer, {
        skipSelf: true,
        kind: options.kind,
      })
      if (!resolved || resolved.external || !/\.d\.[cm]?ts$/.test(resolved.id)) {
        return resolved
      }
      // tsconfig paths can supply types for a package without replacing its
      // runtime export. Resolve that package with the same native conditions,
      // but without the declaration alias, and preserve import/require selection.
      const kind = options.kind === 'require-call' ? 'require' : 'import'
      let resolver = resolvers.get(kind)
      if (!resolver) {
        const { ResolverFactory } = await import('rolldown/experimental')
        resolver = new ResolverFactory({
          ...getNativeResolveConfig(platform),
          conditionNames: ['react-native', 'browser', kind, 'default'],
        })
        resolvers.set(kind, resolver)
      }
      const runtime = resolver.sync(importer ? dirname(importer) : root, source)
      if (!runtime.path || /\.d\.[cm]?ts$/.test(runtime.path)) {
        this.error(
          `Native import ${source} resolves to a declaration without a runtime export`
        )
      }
      return this.resolve(runtime.path, importer, { skipSelf: true, kind: options.kind })
    },
  }
}

function nativeAssetRegistryPlugin(root: string): Plugin {
  let registryPath: string | null | undefined
  return {
    name: 'vxrn:asset-registry',
    async resolveId(source, importer) {
      if (
        source !== 'react-native/asset-registry' &&
        source !== '@react-native/assets-registry/registry'
      ) {
        return
      }
      if (registryPath === undefined) {
        try {
          const reactNativeRoot = dirname(resolvePath('react-native/package.json', root))
          // RN 0.87 moved the singleton into RN and exports this file as
          // react-native/asset-registry. Older RN versions own it in a package.
          const exportedRegistry = join(reactNativeRoot, 'src/asset-registry.js')
          registryPath = existsSync(exportedRegistry)
            ? exportedRegistry
            : resolvePath('@react-native/assets-registry/registry', reactNativeRoot)
        } catch {
          registryPath = null
        }
      }
      if (registryPath) {
        return this.resolve(normalizePath(registryPath), importer, { skipSelf: true })
      }
    },
  }
}

function nativePackageDedupePlugin(root: string): Plugin {
  // these packages share one native runtime; nested copies cannot initialize it twice.
  const packages = new Set([
    ...dedupe,
    'react-native-worklets',
    'react-native-nitro-modules',
  ])
  return {
    name: 'vxrn:native-package-dedupe',
    async resolveId(source) {
      const parts = source.split('/')
      const packageName = source.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]
      if (!packages.has(packageName)) return
      // use the app's package copy for contexts and subpaths, preserving the
      // native export conditions selected by rolldown.
      return this.resolve(source, join(root, 'package.json'), { skipSelf: true })
    },
  }
}

function reactNativeDedupePlugin(root: string): Plugin {
  // package managers can install the same react native version at multiple
  // physical paths. rolldown assigns each path a module identity, so resolving
  // every entry through the app's instance prevents setup-env from running twice.
  //
  // resolving through the filesystem also keeps react native 0.87's narrow
  // package.json `exports` (it dropped `./*` and `./src/*`) from rejecting deep
  // imports such as `react-native/src/private/featureflags/*`, which
  // @react-native/virtualized-lists makes and metro resolves off disk.
  let reactNativeRoot: string | null | undefined

  return {
    name: 'vxrn:react-native-dedupe',
    async resolveId(source, importer, options) {
      if (source !== 'react-native' && !source.startsWith('react-native/')) return

      if (reactNativeRoot === undefined) {
        try {
          reactNativeRoot = realpathSync(
            dirname(resolvePath('react-native/package.json', root))
          )
        } catch {
          // no react native to resolve (for example a project that only stubs
          // `react-native/asset-registry`). fall through to rolldown's own
          // resolution instead of failing the build.
          reactNativeRoot = null
        }
      }
      if (!reactNativeRoot) return

      // public subpaths can map to different filenames through package exports.
      // resolve them from the app before handling private filesystem imports.
      const exported = await this.resolve(source, join(root, 'package.json'), {
        skipSelf: true,
        kind: options.kind,
      })
      if (exported) return exported

      const subpath =
        source === 'react-native' ? 'index.js' : source.slice('react-native/'.length)
      const unified = await this.resolve(
        normalizePath(resolve(reactNativeRoot, subpath)),
        importer,
        { skipSelf: true, kind: options.kind }
      )
      if (unified) return unified
      // never fall through to importer-relative resolution: a nested copy
      // would load beside the app copy and initialize the runtime twice. a
      // file missing from the app copy is version skew, and skew must fail
      // loudly instead of forking the singleton.
      this.error(
        `[vxrn] '${source}' is missing from the app's react-native (${reactNativeRoot}), ` +
          `imported by '${importer}'. refusing the nested copy so the native runtime stays a singleton.`
      )
    },
  }
}

/**
 * Stub CSS imports for native builds.
 * Native doesn't support CSS and rolldown removed CSS bundling support.
 * Without this, any `import './foo.css'` will cause a build error.
 */
function cssStubPlugin(): Plugin {
  return {
    name: 'vxrn:css-stub',
    load: {
      handler(id) {
        if (id.endsWith('.css')) {
          return { code: '', moduleType: 'js' as any }
        }
      },
    },
  }
}

/**
 * pipe files through @vxrn/compiler's babel transforms.
 * handles reanimated worklet compilation, async generator downleveling,
 * react compiler, and react-refresh (dev only).
 */
export function vxrnCompilerPlugin(
  platform: string,
  dev: boolean,
  projectRoot = process.cwd(),
  sourceMaps = false
): Plugin {
  let compiler: typeof import('@vxrn/compiler') | null = null

  // whether a file is a user file that should get react-refresh wiring
  const isRefreshCandidate = (id: string) =>
    dev &&
    !id.includes('node_modules') &&
    !id.includes('__virtual-native-entry') &&
    /\.[tj]sx?$/.test(id)

  return {
    name: 'vxrn:compiler',
    async transform(code, id) {
      if (!/\.[cm]?[jt]sx?$/.test(id)) return
      if (id.includes('\0') || id.includes('virtual:')) return

      const needsRefresh = isRefreshCandidate(id)

      if (!compiler) compiler = await import('@vxrn/compiler')

      const props = {
        id,
        code,
        projectRoot,
        development: dev,
        // the compiler's native gate is ios or android. macos uses the ios
        // transforms. module resolution stays .macos and does not follow .ios.
        environment: (platform === 'android' ? 'android' : 'ios') as 'ios' | 'android',
        reactForRNVersion: '19' as const,
      }

      let babelOptions = compiler.getBabelOptions(props)

      let curCode = code
      const intermediateMaps: any[] = []

      const isWorkletPlugin = (entry: any) => {
        if (!entry) return false
        const name =
          typeof entry === 'string' ? entry : Array.isArray(entry) ? entry[0] : null
        return (
          typeof name === 'string' &&
          (name.includes('react-native-worklets') ||
            name.includes('react-native-reanimated'))
        )
      }
      const workletEntry = babelOptions?.plugins?.find(isWorkletPlugin)
      const workletPluginOptions = Array.isArray(workletEntry)
        ? workletEntry[1]
        : undefined
      const useWorklets =
        compiler.isNativeWorkletsEnabled() &&
        (Boolean(workletEntry) || compiler.shouldTransformWorklets({ id, code }))
      const compilerPluginIndex =
        babelOptions?.plugins?.findIndex(
          (x) => Array.isArray(x) && x[0] === 'babel-plugin-react-compiler'
        ) ?? -1

      if (compilerPluginIndex !== -1) {
        // preserve automatic worklet candidates before react compiler hoists them.
        if (useWorklets) {
          const prepared = compiler.prepareWorkletsForReactCompiler(
            id,
            curCode,
            sourceMaps
          )
          if (prepared) {
            curCode = prepared.code
            if (prepared.map) intermediateMaps.push(prepared.map)
          }
        }
        const compilerPluginConfig = babelOptions!.plugins![compilerPluginIndex] as any[]
        const compilerPluginOptions = compilerPluginConfig[1] || {}
        const useBabelCompiler =
          compilerPluginOptions.compiler === 'babel' ||
          process.env.ONE_REACT_COMPILER === 'babel' ||
          process.env.VXRN_REACT_COMPILER === 'babel'

        if (!useBabelCompiler) {
          const compilerOut = await compiler.transformOxcReactCompiler(
            id,
            curCode,
            compilerPluginOptions,
            sourceMaps
          )
          if (compilerOut?.code) {
            curCode = compilerOut.code
            if (sourceMaps && compilerOut.map) intermediateMaps.push(compilerOut.map)
          }
          babelOptions!.plugins!.splice(compilerPluginIndex, 1)
          if (
            babelOptions!.plugins!.length === 0 &&
            !babelOptions!.configFile &&
            !babelOptions!.babelrc
          ) {
            babelOptions = null
          }
        }
      }

      if (useWorklets) {
        const workletOut = await compiler.transformWorklets(id, curCode, sourceMaps, {
          projectRoot,
          ...workletPluginOptions,
        })
        if (workletOut?.code) {
          curCode = workletOut.code
          if (sourceMaps && workletOut.map) intermediateMaps.push(workletOut.map)
        }
        if (babelOptions?.plugins) {
          babelOptions.plugins = babelOptions.plugins.filter(
            (entry) => !isWorkletPlugin(entry)
          )
          if (
            babelOptions.plugins.length === 0 &&
            !babelOptions.configFile &&
            !babelOptions.babelrc
          ) {
            babelOptions = null
          }
        }
      }

      if (!babelOptions && !needsRefresh) {
        if (curCode !== code) {
          let finalMap: any = undefined
          if (sourceMaps && intermediateMaps.length > 0) {
            if (intermediateMaps.length === 1) {
              finalMap = intermediateMaps[0]
            } else {
              const remapping = (await import('@jridgewell/remapping')).default
              finalMap = remapping(intermediateMaps.slice().reverse(), () => null)
            }
          }
          return { code: curCode, map: finalMap }
        }
        return
      }

      if (sourceMaps && babelOptions) {
        // Individual stage maps are collected in intermediateMaps and composed
        // once via remapping([wrapMap, refreshMap, ...intermediateMaps.reverse()]).
        // Do not pass intermediateMaps as inputSourceMap to Babel, which would
        // cause Babel to pre-compose and remapping to double-compose the compiler map.
        babelOptions = {
          ...babelOptions,
          sourceMaps: true,
          sourceFileName: id,
        }
        delete (babelOptions as any).inputSourceMap
      }

      if (babelOptions) {
        const result = await compiler.transformBabel(id, curCode, babelOptions)
        if (result?.code) {
          curCode = result.code
          if (sourceMaps && result.map) {
            intermediateMaps.push(result.map)
          }
          if (!needsRefresh) {
            let finalMap: any = undefined
            if (sourceMaps && intermediateMaps.length > 0) {
              if (intermediateMaps.length === 1) {
                finalMap = intermediateMaps[0]
              } else {
                const remapping = (await import('@jridgewell/remapping')).default
                finalMap = remapping(intermediateMaps.slice().reverse(), () => null)
              }
            }
            return { code: curCode, map: finalMap }
          }
        }
      }

      if (needsRefresh) {
        const { transformSync } = await import('oxc-transform-react')
        const jsxImportSource =
          compiler.configuration?.enableNativewind && !id.includes('node_modules')
            ? 'nativewind'
            : 'react'

        const res = transformSync(id, curCode, {
          jsx: {
            development: dev,
            runtime: 'automatic',
            importSource: jsxImportSource,
            refresh: {
              refreshReg: '__vxrnRefreshReg',
              refreshSig: '__vxrnRefreshSig',
            },
          },
          reactCompiler: false,
          sourcemap: sourceMaps,
        })

        if (res.fatal) {
          throw new Error(
            `[vxrn:compiler] oxc react transform failed on ${id}: ${(res.errors ?? [])
              .map((e: any) => e.message ?? String(e))
              .join(', ')}`
          )
        }

        const escapedId = id.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
        const header = `var __prevRefreshReg = globalThis.$RefreshReg$;
var __prevRefreshSig = globalThis.$RefreshSig$;
if (globalThis.__ReactRefresh) {
  globalThis.$RefreshReg$ = function(type, id) {
    globalThis.__ReactRefresh.register(type, "${escapedId}" + " " + id);
  };
  globalThis.$RefreshSig$ = globalThis.__ReactRefresh.createSignatureFunctionForTransform;
}
// keep registration calls local so rolldown retains them in the initial bundle.
var __vxrnRefreshReg = globalThis.$RefreshReg$;
var __vxrnRefreshSig = globalThis.$RefreshSig$;

`
        const footer = `

globalThis.$RefreshReg$ = __prevRefreshReg;
globalThis.$RefreshSig$ = __prevRefreshSig;
if (import.meta.hot) {
  import.meta.hot.acceptReactRefresh(function() {
    if (globalThis.__ReactRefresh) {
      setTimeout(function() { globalThis.__ReactRefresh.performReactRefresh(); }, 30);
    }
  });
}
`
        let out: string
        let finalMap: any = undefined

        if (sourceMaps) {
          const MagicString = (await import('magic-string')).default
          const ms = new MagicString(res.code)
          ms.prepend(header)
          ms.append(footer)
          out = ms.toString()
          const wrapMap = ms.generateMap({ source: id, hires: true })

          const allMaps = [
            wrapMap,
            res.map,
            ...intermediateMaps.slice().reverse(),
          ].filter(Boolean)
          const remapping = (await import('@jridgewell/remapping')).default
          finalMap = remapping(allMaps, () => null)
        } else {
          out = header + res.code + footer
        }

        return { code: out, map: finalMap }
      }
    },
  }
}

// run after syntax-aware native transforms and before rolldown classifies modules.
function mixedNativeModulePlugin(sourceMaps: boolean): Plugin {
  return {
    name: 'vxrn:mixed-native-module',
    async transform(code, id) {
      if (!/\.[cm]?[jt]sx?$/.test(id) || id.includes('\0')) return
      const { transformMixedNativeModule } = await import('@vxrn/compiler')
      return transformMixedNativeModule(code, id, sourceMaps)
    },
  }
}

/**
 * Strip Flow types from react-native and other Flow-authored source files.
 *
 * The `.vxrn.original` patch step rewrites some of these packages in
 * node_modules ahead of time, but that step is best-effort and skips a module
 * whose transform throws. Deciding here on the file's own contents means the
 * bundle no longer depends on that mutation having succeeded.
 */
function flowStripPlugin(): Plugin {
  return {
    name: 'vxrn:flow-strip',
    transform: {
      async handler(code, id) {
        if (!shouldStripFlow(id, code)) return

        const { stripFlowTypes } = await import('@vxrn/compiler')
        const result = await stripFlowTypes(id, code)
        // don't set moduleType - let rolldown's global moduleTypes config handle it
        return { code: result.code, map: result.map }
      },
    },
  }
}

/**
 * Handle asset imports (.png, .jpg, .ttf, etc.)
 * Returns JS code that registers the asset with RN's AssetRegistry.
 */
function assetPlugin(opts: {
  root: string
  platform: string
  assetsDest?: string
  onAsset?: (asset: NativeAssetData) => void
}): Plugin {
  const assetRegex = new RegExp(`\\.(?:${DEFAULT_ASSET_EXTS.join('|')})$`)

  return {
    name: 'vxrn:asset',
    load: {
      async handler(id) {
        if (!assetRegex.test(id)) return

        const assetData = await getNativeAssetData(id, opts.root, opts.platform)
        opts.onAsset?.(assetData)

        if (opts.assetsDest) {
          copyNativeAssetFiles(assetData, opts.assetsDest, opts.platform)
        }

        const code = `module.exports = require('react-native/asset-registry').registerAsset(${JSON.stringify(assetData)});`

        return { code, moduleType: 'js' as any }
      },
    },
  }
}

type NativeAssetData = {
  __packager_asset: true
  name: string
  type: string
  scales: number[]
  files: string[]
  httpServerLocation: string
  fileSystemLocation: string
  hash: string
  width?: number
  height?: number
}

export type NativeDevAsset = {
  filePath: string
  hash: string
  type: string
}

export function createNativeDevAssetRegistry(): {
  register: (asset: NativeAssetData) => void
  resolve: (pathname: string, hash?: string) => NativeDevAsset | undefined
} {
  const assets = new Map<string, NativeDevAsset>()

  return {
    register(asset) {
      for (const [index, scale] of asset.scales.entries()) {
        const filePath = asset.files[index]
        if (!filePath) continue
        const fileName = `${asset.name}${scale === 1 ? '' : `@${scale}x`}.${asset.type}`
        assets.set(`${asset.httpServerLocation}/${fileName}`, {
          filePath,
          hash: asset.hash,
          type: asset.type,
        })
      }
    },

    resolve(pathname, hash) {
      const asset = assets.get(pathname)
      if (!asset || (hash !== undefined && hash !== asset.hash)) return
      return asset
    },
  }
}

type ParsedNativeAssetName = {
  name: string
  scale: number
  platform: string | undefined
  type: string
}

const NATIVE_IMAGE_EXTS = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'bmp',
  'psd',
  'svg',
  'tiff',
  'ktx',
])

function parseNativeAssetName(filePath: string): ParsedNativeAssetName | undefined {
  const type = extname(filePath).slice(1)
  if (!type) return

  const stem = basename(filePath, `.${type}`)
  const platformMatch = stem.match(/^(.*)\.(ios|android)$/)
  const platform = platformMatch?.[2]
  const unqualifiedStem = platformMatch?.[1] ?? stem
  const scaleMatch = unqualifiedStem.match(/^(.+?)(?:@([\d.]+)x)?$/)
  if (!scaleMatch) return

  const scale = scaleMatch[2] === undefined ? 1 : Number.parseFloat(scaleMatch[2])
  if (!Number.isFinite(scale) || scale <= 0) return

  return {
    name: scaleMatch[1],
    scale,
    platform,
    type,
  }
}

function getNativeAssetUrlDirectory(root: string, assetDirectory: string): string {
  const relativeDirectory = relative(
    realpathSync(root),
    realpathSync(assetDirectory)
  ).replace(/\\/g, '/')
  const safeDirectory = relativeDirectory
    .split('/')
    .filter((segment) => segment && segment !== '.')
    .map((segment) => (segment === '..' ? '_' : segment))
    .join('/')
  return safeDirectory ? `/assets/${safeDirectory}` : '/assets'
}

export async function getNativeAssetData(
  id: string,
  root: string,
  platform: string
): Promise<NativeAssetData> {
  const requested = parseNativeAssetName(id)
  if (!requested) {
    throw new Error(`[vxrn] invalid native asset path: ${id}`)
  }

  const assetDirectory = dirname(id)
  const filesByScale = new Map<number, { file: string; platformSpecific: boolean }>()

  for (const fileName of readdirSync(assetDirectory)) {
    const candidate = parseNativeAssetName(fileName)
    if (
      !candidate ||
      candidate.name !== requested.name ||
      candidate.type !== requested.type ||
      (candidate.platform !== undefined && candidate.platform !== platform)
    ) {
      continue
    }

    const platformSpecific = candidate.platform === platform
    const existing = filesByScale.get(candidate.scale)
    if (!existing || (platformSpecific && !existing.platformSpecific)) {
      filesByScale.set(candidate.scale, {
        file: join(assetDirectory, fileName),
        platformSpecific,
      })
    }
  }

  const scales = [...filesByScale.keys()].sort((a, b) => a - b)
  const files = scales.map((scale) => filesByScale.get(scale)!.file)
  if (files.length === 0) {
    throw new Error(`[vxrn] native asset has no files for ${platform}: ${id}`)
  }

  const hash = createHash('md5')
  for (const file of files) hash.update(readFileSync(file))

  const assetData: NativeAssetData = {
    __packager_asset: true,
    name: requested.name,
    type: requested.type,
    scales,
    files,
    httpServerLocation: getNativeAssetUrlDirectory(root, assetDirectory),
    fileSystemLocation: assetDirectory,
    hash: hash.digest('hex'),
  }

  if (NATIVE_IMAGE_EXTS.has(requested.type)) {
    try {
      const { imageSize } = await import('image-size')
      const dims = imageSize(readFileSync(files[0]))
      assetData.width = dims.width === undefined ? undefined : dims.width / scales[0]
      assetData.height = dims.height === undefined ? undefined : dims.height / scales[0]
    } catch {}
  }

  return assetData
}

function getIOSAssetScales(scales: number[]): number[] {
  const supported = scales.filter((scale) => scale === 1 || scale === 2 || scale === 3)
  if (supported.length > 0 || scales.length === 0) return supported
  return [scales.find((scale) => scale > 3) ?? scales[scales.length - 1]]
}

function getAndroidAssetDirectory(type: string, scale: number): string {
  if (
    !new Set(['gif', 'heic', 'heif', 'jpeg', 'jpg', 'ktx', 'png', 'webp', 'xml']).has(
      type
    )
  ) {
    return 'raw'
  }

  const density = new Map([
    [0.75, 'ldpi'],
    [1, 'mdpi'],
    [1.5, 'hdpi'],
    [2, 'xhdpi'],
    [3, 'xxhdpi'],
    [4, 'xxxhdpi'],
  ]).get(scale)
  if (density) return `drawable-${density}`
  return `drawable-${Math.round(scale * 160)}dpi`
}

function getAndroidAssetName(asset: NativeAssetData): string {
  return `${asset.httpServerLocation}/${asset.name}`
    .toLowerCase()
    .replace(/^\//, '')
    .replace(/\//g, '_')
    .replace(/([^a-z0-9_])/g, '')
    .replace(/^assets_/, '')
}

function copyNativeAssetFiles(
  asset: NativeAssetData,
  assetsDest: string,
  platform: string
): void {
  const validIOSScales = new Set(getIOSAssetScales(asset.scales))

  for (const [index, scale] of asset.scales.entries()) {
    if (platform === 'ios' && !validIOSScales.has(scale)) continue

    const destination =
      platform === 'android'
        ? join(
            assetsDest,
            getAndroidAssetDirectory(asset.type, scale),
            `${getAndroidAssetName(asset)}.${asset.type}`
          )
        : join(
            assetsDest,
            asset.httpServerLocation.slice(1),
            `${asset.name}${scale === 1 ? '' : `@${scale}x`}.${asset.type}`
          )
    mkdirSync(dirname(destination), { recursive: true })
    copyFileSync(asset.files[index], destination)
  }
}

/**
 * SWC transform for Hermes compatibility.
 * Lowers classes, lexical bindings, and async syntax for legacy Hermes.
 * Inspired by rollipop's swc-plugin.ts.
 */
export function hermesCompatSWCPlugin(
  dev: boolean,
  sourceMaps = false,
  keepNames = false
): Plugin {
  let oxc: typeof import('oxc-transform') | null = null

  return {
    name: 'vxrn:hermes-compat',
    async transform(code, id) {
      if (!/\.[cm]?[jt]sx?$/.test(id)) return
      if (id.includes('\0') || id.includes('virtual:')) return
      // skip files that don't need transformation
      const hasClass = /\bclass(?:\s|\{)/.test(code)
      const hasAsync = code.includes('async')
      const hasBlockScopedBinding = /\b(?:const|let)\s/.test(code)
      if (!hasClass && !hasAsync && !hasBlockScopedBinding) return
      let output: { code: string; map?: any } | undefined
      // Keep the Oxc limit for other large prebuilt files. Class, lexical binding,
      // and async lowering below have no size exemption for legacy Hermes.
      if (code.length <= 500_000 || hasClass) {
        if (!oxc) oxc = await import('oxc-transform')
        const lang = /\.[cm]?ts$/.test(id) ? 'ts' : id.endsWith('.tsx') ? 'tsx' : 'jsx'
        const result = oxc.transformSync(id, code, {
          lang,
          target: 'es2020',
          assumptions: { setPublicClassFields: true },
          jsx: 'preserve',
          sourcemap: sourceMaps,
          sourceType: id.endsWith('.cjs') ? 'script' : 'module',
        })
        if (result.errors?.length) {
          const err = result.errors[0]
          throw new Error(err.message + (err.codeframe ? `\n${err.codeframe}` : ''))
        }
        output = {
          code: result.code,
          map: sourceMaps ? result.map : undefined,
        }
      }
      if (hasClass || hasBlockScopedBinding) {
        const { transformHermesClasses } = await import('@vxrn/compiler')
        const classes = await transformHermesClasses(output?.code ?? code, id, sourceMaps)
        if (classes) {
          if (classes.map && output?.map) {
            const remapping = (await import('@jridgewell/remapping')).default
            classes.map = remapping([classes.map, output.map], () => null)
          }
          output = classes
        }
      }
      const lowered = await transformHermesAsync(
        output?.code ?? code,
        id,
        sourceMaps,
        undefined,
        keepNames
      )
      if (!lowered) return output
      if (lowered.map && output?.map) {
        const remapping = (await import('@jridgewell/remapping')).default
        lowered.map = remapping([lowered.map, output.map], () => null)
      }
      return lowered
    },
  }
}

export const hermesCompatPlugin = hermesCompatSWCPlugin

/**
 * Hermes gives a loop one environment, not one per iteration, so every closure
 * created in a loop body sees the binding's final value. zod installs its schema
 * methods with `for (const key in methods) defineProperty(proto, key, {get(){...}})`,
 * and without this every method on every zod schema resolved to the last one:
 * `string().nullish()` called `apply` and the app red-screened at startup.
 * See @vxrn/compiler's transformHermesLoops for the bytecode evidence.
 *
 * Rolldown's own interop helpers are emitted after this runs, but they are
 * already `var`-based with `.bind(null, key)`, so they need no rewriting.
 */
export function hermesLoopsPlugin(sourceMaps = false): Plugin {
  let compiler: typeof import('@vxrn/compiler') | null = null

  return {
    name: 'vxrn:hermes-loops',
    async transform(code, id) {
      if (!/\.[cm]?[jt]sx?$/.test(id)) return
      if (id.includes('\0') || id.includes('virtual:')) return

      if (!compiler) compiler = await import('@vxrn/compiler')
      const result = compiler.transformHermesLoops(code, id)
      if (!result) return

      if (!sourceMaps) return { code: result.code, map: null }
      if (result.maps.length === 1)
        return { code: result.code, map: result.maps[0] as any }
      const remapping = (await import('@jridgewell/remapping')).default
      return {
        code: result.code,
        map: remapping(result.maps.slice().reverse(), () => null) as any,
      }
    },
  }
}

// --- HMR runtime ---

export function getHmrRuntimeSource(): string {
  return `
// vxrn HMR runtime for rolldown devMode
var BaseDevRuntime = DevRuntime;

class ReactNativeDevRuntime extends BaseDevRuntime {
  constructor() {
    var clientId = 'rn-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    super(clientId);
    this._socket = null;
    this.moduleHotContexts = {};
    this.lastSeq = 0;
  }

  createModuleHotContext(moduleId) {
    var runtime = this;
    var ctx = {
      acceptCallbacks: [],
      reactRefreshAcceptCallback: null,
      accept: function(deps, callback) {
        if (typeof deps === 'function' || !deps) {
          ctx.acceptCallbacks.push({
            deps: [moduleId],
            fn: function(modules) { if (typeof deps === 'function') deps(modules[0]); }
          });
        } else if (typeof deps === 'string') {
          ctx.acceptCallbacks.push({
            deps: [deps],
            fn: function(modules) { if (callback) callback(modules[0]); }
          });
        } else if (Array.isArray(deps)) {
          ctx.acceptCallbacks.push({ deps: deps, fn: callback || function() {} });
        }
      },
      acceptReactRefresh: function(callback) {
        ctx.reactRefreshAcceptCallback = callback;
      },
      invalidate: function() { runtime.requestReload('module invalidated: ' + moduleId); },
      on: function() {},
      off: function() {},
      send: function() {},
      get refresh() { return globalThis.__ReactRefresh; },
      get refreshUtils() {
        return {
          isReactRefreshBoundary: function(exports) {
            if (!globalThis.__ReactRefresh) return false;
            if (globalThis.__ReactRefresh.isLikelyComponentType(exports)) return true;
            if (!exports || typeof exports !== 'object') return false;
            var hasExports = false, allComponents = true;
            for (var key in exports) {
              hasExports = true;
              if (key === '__esModule') continue;
              if (!globalThis.__ReactRefresh.isLikelyComponentType(exports[key])) allComponents = false;
            }
            return hasExports && allComponents;
          },
          enqueueUpdate: function() {
            if (globalThis.__ReactRefresh) {
              setTimeout(function() { globalThis.__ReactRefresh.performReactRefresh(); }, 50);
            }
          }
        };
      }
    };
    this.moduleHotContexts[moduleId] = ctx;
    return ctx;
  }

  isSelfAccepted(moduleId) {
    var ctx = this.moduleHotContexts[moduleId];
    var explicitlyAccepted = !!(ctx && ctx.acceptCallbacks.some(function(callback) {
      return callback.deps.indexOf(moduleId) !== -1;
    }));
    if (explicitlyAccepted) return { accepted: true, reactRefresh: false };
    if (!ctx || !ctx.reactRefreshAcceptCallback || !globalThis.__ReactRefresh) {
      return { accepted: false, reactRefresh: false };
    }
    var exports = this.loadExports(moduleId);
    return {
      accepted: ctx.refreshUtils.isReactRefreshBoundary(exports),
      reactRefresh: true
    };
  }

  acceptsDependency(parentId, moduleId) {
    var ctx = this.moduleHotContexts[parentId];
    return !!(ctx && ctx.acceptCallbacks.some(function(callback) {
      return callback.deps.indexOf(moduleId) !== -1;
    }));
  }

  findBoundaries(moduleId, traversed, updateSet, boundaries) {
    if (traversed.has(moduleId)) return true;
    traversed.add(moduleId);
    updateSet.add(moduleId);

    var selfAcceptance = this.isSelfAccepted(moduleId);
    if (selfAcceptance.accepted) {
      boundaries.push({
        boundary: moduleId,
        acceptedVia: moduleId,
        reactRefresh: selfAcceptance.reactRefresh
      });
      return true;
    }

    var importers = this.getImporters(moduleId).filter(function(importer) {
      return this.isExecuted(importer);
    }, this);
    if (importers.length === 0) return false;

    for (var i = 0; i < importers.length; i++) {
      var importer = importers[i];
      if (this.acceptsDependency(importer, moduleId)) {
        boundaries.push({ boundary: importer, acceptedVia: moduleId });
      } else if (!this.findBoundaries(importer, traversed, updateSet, boundaries)) {
        return false;
      }
    }
    return true;
  }

  applyHmrUpdate(code, changedIds, seq) {
    if (seq !== this.lastSeq + 1) return false;
    this.lastSeq = seq;

    var traversed = new Set();
    var updateSet = new Set();
    var boundaries = [];
    for (var i = 0; i < changedIds.length; i++) {
      var changedId = changedIds[i];
      if (!this.isExecuted(changedId)) continue;
      if (!this.findBoundaries(changedId, traversed, updateSet, boundaries)) return false;
    }
    // register the patch's factories even when no changed module has run yet,
    // so a later first import executes the edited code rather than a stale one
    if (globalThis.globalEvalWithSourceUrl) globalThis.globalEvalWithSourceUrl(code);
    else (0, eval)(code);
    if (boundaries.length === 0) return true;

    var callbacks = boundaries.map(function(item) {
      var ctx = this.moduleHotContexts[item.boundary];
      var selectedCallbacks = ctx ? ctx.acceptCallbacks.filter(function(callback) {
        return callback.deps.indexOf(item.acceptedVia) !== -1;
      }) : [];
      if (item.reactRefresh && ctx && ctx.reactRefreshAcceptCallback) {
        selectedCallbacks.push({
          deps: [item.acceptedVia],
          fn: function() { ctx.reactRefreshAcceptCallback(); }
        });
      }
      return {
        boundary: item.boundary,
        acceptedVia: item.acceptedVia,
        callbacks: selectedCallbacks
      };
    }, this);

    var modulesToReplace = Array.from(updateSet);
    for (var j = 0; j < modulesToReplace.length; j++) {
      if (!this.hasFactory(modulesToReplace[j])) return false;
    }
    for (var k = 0; k < modulesToReplace.length; k++) {
      this.removeModuleCache(modulesToReplace[k]);
    }

    for (var m = 0; m < callbacks.length; m++) {
      var apply = callbacks[m];
      this.initModule(apply.acceptedVia);
      var freshExports = this.loadExports(apply.acceptedVia);
      for (var n = 0; n < apply.callbacks.length; n++) {
        apply.callbacks[n].fn([freshExports]);
      }
    }

    for (var p = 0; p < changedIds.length; p++) {
      try {
        if (globalThis.__VXRN_ON_MODULE_UPDATED__) {
          globalThis.__VXRN_ON_MODULE_UPDATED__(changedIds[p]);
        }
      } catch (error) {
        console.error('[vxrn HMR]: module update hook failed', error);
      }
    }
    return true;
  }

  requestReload(reason) {
    if (this._socket && this._socket.readyState === 1) {
      this._socket.send(JSON.stringify({ type: 'hmr:invalidate', reason: reason }));
    }
  }

  reload(reason) {
    var reloadNativeBundle = globalThis.__VXRN_RELOAD_NATIVE_DEV_BUNDLE__;
    if (typeof reloadNativeBundle === 'function') {
      reloadNativeBundle(reason);
      return;
    }
    console.error('[vxrn HMR]: DevSettings.reload is unavailable');
  }

  setup(socket) {
    if (this._socket) return;
    this._socket = socket;
    var runtime = this;
    // addEventListener rather than socket.onmessage: the bundle's WebSocket is
    // whatever the host platform provides, and a host that does not honor on*
    // property assignment would otherwise leave the app permanently without
    // Fast Refresh and say nothing.
    socket.addEventListener('message', function(event) {
      var message;
      try {
        message = JSON.parse(event.data);
      } catch (error) {
        return;
      }
      try {
        if (message.type === 'hmr:update') {
          // a patch that cannot be applied in place is the reload signal
          if (!runtime.applyHmrUpdate(message.code, message.changedIds, message.seq)) {
            runtime.reload('native HMR update could not be applied');
          }
        } else if (message.type === 'hmr:reload') {
          runtime.reload('native route map changed');
        }
      } catch (error) {
        console.error('[vxrn HMR]: failed to apply update', error);
      }
    });
    socket.addEventListener('error', function(event) {
      console.warn('[vxrn HMR]: connection error', (event && event.message) || event);
    });
  }
}

globalThis.__rolldown_runtime__ = new ReactNativeDevRuntime();
`
}
