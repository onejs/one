/**
 * Creates a rolldown DevEngine for native React Native bundle serving.
 * Uses rolldown's experimental dev() API with ESM output.
 *
 * Inspired by rollipop's architecture:
 * https://github.com/leegeunhyeok/rollipop
 */

import { createHash } from 'node:crypto'
import { basename, dirname, extname, join, relative, resolve } from 'node:path'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  realpathSync,
  readdirSync,
  statSync,
  readFileSync,
} from 'node:fs'
import { pathToFileURL } from 'node:url'
import micromatch from 'micromatch'
import type { InputOptions, OutputOptions, Plugin, RolldownOutput } from 'rolldown'
import type { DevEngine } from 'rolldown/experimental'
import { loadEnv as loadViteEnv, normalizePath } from 'vite'
import { shouldStripFlow, transformHermesAsync } from '@vxrn/compiler'
import { DEFAULT_ASSET_EXTS } from '../constants/defaults'
import { getNativePrelude } from '../runtime/native-prelude'
import { rnCodegenPlugin } from '../plugins/rnCodegenPlugin'

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
  platform: 'ios' | 'android'
  dev: boolean
}

interface NativeDevEngineOptions {
  root: string
  port: number
  host?: string
  platform: 'ios' | 'android'
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
  getAsset: (pathname: string, hash?: string) => NativeDevAsset | undefined
  close: () => Promise<void>
  handleRouteFileChange: (file: string) => Promise<void>
}

// shared resolve extensions for native builds
function getResolveExtensions(platform: 'ios' | 'android'): string[] {
  const platformExts =
    platform === 'ios'
      ? ['.ios.tsx', '.ios.ts', '.ios.jsx', '.ios.js']
      : ['.android.tsx', '.android.ts', '.android.jsx', '.android.js']
  const nativeExts = ['.native.tsx', '.native.ts', '.native.jsx', '.native.js']
  const defaultExts = ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.cjs', '.json']
  return [...platformExts, ...nativeExts, ...defaultExts]
}

// shared rolldown resolve config for native builds
function getNativeResolveConfig(platform: 'ios' | 'android') {
  return {
    extensions: getResolveExtensions(platform),
    // Rolldown supplies `import`, `require`, and `default` contextually. Adding
    // both here makes a CommonJS require eligible for an export map's ESM
    // `import` target (for example @babel/runtime), which turns callable CJS
    // helpers into namespace objects at runtime.
    conditionNames: ['react-native'],
    mainFields: ['react-native', 'module', 'main'],
  }
}

// shared rolldown transform config for native builds
export function getNativeTransformConfig(
  platform: 'ios' | 'android',
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

  // Match One's Vite client contract: load public values from process.env and
  // the mode-specific env files, with shell values taking precedence. Native
  // apps commonly use Expo's EXPO_PUBLIC_ prefix; accepting only VITE_ here
  // made the same source silently receive `undefined` after leaving Metro.
  const publicEnv = loadViteEnv(mode, root, ['VITE_', 'EXPO_PUBLIC_'])
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
      // Public values are applied first so platform-owned keys cannot inherit
      // the SSR values used while loading One's Vite config.
      ...envDefines,
      'process.env.NODE_ENV': JSON.stringify(mode),
      'process.env.VXRN_REACT_19': 'false',
      'process.env.VITE_ENVIRONMENT': JSON.stringify(platform),
      'process.env.VITE_NATIVE': '"1"',
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

// shared plugins used by both dev and prod native builds
function getNativePlugins(
  root: string,
  platform: NativePluginContext['platform'],
  viteImportGlobPlugin: any,
  dev: boolean,
  assetsDest?: string,
  onAsset?: (asset: NativeAssetData) => void,
  sourceMaps = false,
  userPlugins: Plugin[] = []
): Plugin[] {
  const context: NativePluginContext = { root, platform, dev }
  return [
    // plugins provided by One (clientTreeShakePlugin for loader removal, etc.)
    ...(globalThis.__vxrnAddNativePlugins || []),
    // block .server.* and _middleware.* files from entering the native bundle
    serverFileExclusionPlugin(),
    // guard server-only / client-only / web-only / native-only imports
    environmentGuardPlugin(),
    // alias RN's Metro HMR client to a no-op; vxrn drives HMR itself (the
    // rolldown-runtime WebSocket); RN's client otherwise opens a /hot socket and
    // red-boxes "unknown-message [object Object]" on every edit (new arch)
    hmrClientNoopPlugin(),
    // stub CSS imports — native doesn't support CSS and rolldown removed CSS bundling
    cssStubPlugin(),
    // handle import.meta.glob (used by One's route system)
    viteImportGlobPlugin({ root }),
    // @vxrn/compiler babel transforms: reanimated worklets, async generators,
    // react-native codegen, react compiler, same pipeline as metro. runs before
    // flowStripPlugin so react-native's Flow `.js` specs reach codegen with their
    // type argument intact. stripping Flow first would erase it (which is why the
    // codegen "didn't run for <Component>" warning fired).
    vxrnCompilerPlugin(platform, dev, root, sourceMaps),
    // react-native codegen: transforms TurboModule / Fabric specs before Flow stripping
    rnCodegenPlugin({ projectRoot: root }),
    // strip Flow from any react-native / @react-native `.js` the compiler didn't
    // handle, the guaranteed safety net before rolldown's oxc core parse (which
    // can't parse Flow). now downstream of the compiler, so codegen sees the types.
    flowStripPlugin(),
    // guard undefined native methods in NativeAnimatedHelper
    nativeAnimatedGuardPlugin(),
    // handle asset imports (.png, .jpg, .ttf, etc.)
    assetPlugin({ root, platform, assetsDest, onAsset }),
    // hermes compat: transform class properties and private fields
    hermesCompatSWCPlugin(dev, sourceMaps),
    // hermes compat: per-iteration loop bindings. runs last so it also covers
    // loops the earlier lowering steps emit.
    hermesLoopsPlugin(sourceMaps),
    ...userPlugins,
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
  // same interop to bundled require helpers and HMR's runtime export lookups.
  return code.replace(
    /(\b__toESM(?:\$\d+)?\(\s*(?:require[\w$]*\(\)|__rolldown_runtime__\.loadExports\("(?:\\.|[^"\\])*"\))\s*),\s*1(\s*\))/g,
    '$1$2'
  )
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
 * Wrap the dev bundle body in a function scope so module top-level
 * `var`/`function` declarations don't leak onto the global object.
 *
 * rolldown's dev() emits the bundle as a *script*. A top-level `var` in a
 * script creates a NON-configurable property on the global object. RN's
 * `Libraries/Network/fetch.js` declares `var ... Headers, Request, ...`, so
 * `global.Headers`/`global.Request` become non-configurable. RN's `setUpXHR`
 * then calls `polyfillGlobal('Headers', ...)`, whose `polyfillObjectProperty`
 * does `Object.defineProperty(global, 'Headers', { configurable: true, ... })`
 * — which throws "Cannot redefine property" and RN converts to
 * `console.error('Failed to set polyfill. Headers is not configurable.')`.
 * In dev that console.error becomes a blocking LogBox redbox, so the app never
 * mounts (every appium navigation then times out). The prod build is immune:
 * its modules are wrapped in closures (no global leak) and it has no LogBox.
 *
 * Wrapping everything after the prelude in an IIFE makes those module vars
 * function-scoped, matching prod, so `polyfillGlobal` succeeds. The prelude
 * stays at script scope because it intentionally installs globals
 * (`globalThis.global`/`__DEV__`/`process`/...). Intentional globals survive:
 * the runtime is assigned via `globalThis.__rolldown_runtime__ = ...`, and HMR
 * updates run through a *direct* `eval` inside this scope, so they still see
 * the closure's `__esmMin`/`__toCommonJS`/module bindings.
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

  const resolvedHost = host === '0.0.0.0' ? 'localhost' : host
  const virtualEntry = nativeVirtualEntryPlugin(root, { dev: true })

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
    // only polyfilled once InitializeCore has run) and hand it to the runtime,
    // which owns every message it carries. handed over immediately rather than
    // from an open handler: a host that does not honor `socket.onopen = fn`
    // would otherwise silently never get Fast Refresh.
    outro: `
try {
  var __WS = (init_WebSocket(), __toCommonJS(WebSocket_exports)).default;
  var __hmrUrl = 'ws://${resolvedHost}:${port}/hot?platform=${platform}&clientId=' + encodeURIComponent(__rolldown_runtime__.clientId);
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

  const rebuildIfRouteGraphChanged = (files: string[]): Promise<boolean> =>
    queueEngineWork(async () => {
      // rolldown and vite can both report the same addition. decide after all
      // earlier engine work so only the first notification sees a changed
      // route set.
      const { routeRoot, files: knownRoutes, isRouteFile } = virtualEntry.routes
      const routeRootPrefix = `${normalizePath(routeRoot)}/`
      const routeSetChanged = files.some((file) => {
        const normalized = normalizePath(file)
        const entry = statSync(file, { throwIfNoEntry: false })
        if (isRouteFile(normalized)) {
          return entry?.isFile() === true
            ? !knownRoutes.has(normalized)
            : knownRoutes.has(normalized)
        }
        if (!normalized.startsWith(routeRootPrefix)) return false
        return entry?.isDirectory() === true
          ? true
          : [...knownRoutes].some((route) => route.startsWith(`${normalized}/`))
      })
      if (!routeSetChanged) return false

      // the reload must never serve the bundle from before the route set changed.
      // onOutput may begin after ensureLatestBuildOutput resolves, so clear the
      // cached bundle before triggering work and let getBundle wait for it.
      currentBundle = null
      engine.triggerFullBuild()
      await engine.ensureLatestBuildOutput()
      await outputProcessed
      onHmrUpdate?.({ type: 'hmr:reload' })
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
      if (result instanceof Error) {
        console.error('[vxrn] HMR error:', result.message)
        onHmrUpdate?.({ type: 'hmr:error' })
        return
      }

      // adding or deleting a route changes a route map that was expanded when
      // the entry transformed. only a full build re-expands it, and rolldown
      // tells no client that happened, so the reload is sent from here.
      if (await rebuildIfRouteGraphChanged(result.changedFiles)) return

      for (const { clientId, update } of result.updates) {
        if (update.type === 'Patch' && update.code) {
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
    watch: {},
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
      let code = postProcessNativeBundle(chunk.code)

      // downlevel class fields from the rolldown runtime (virtual module
      // skipped by the per-file SWC plugin) so old Hermes can parse them
      code = await downlevelClassFieldsInBundle(code)
      assertBundleLinesPreserved(chunk.code, code, 'dev')

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

  return {
    engine,

    async getBundle() {
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
    },

    getAsset(pathname, hash) {
      return assetRegistry.resolve(pathname, hash)
    },

    async close() {
      await engine.close()
    },

    // vite's watcher sees route additions that rolldown's directory watches can
    // miss, and supplies the path when a route is deleted. both change the
    // import.meta.glob expansion and therefore require a full route-map build.
    // ordinary edits to an existing route remain Fast Refresh patches.
    async handleRouteFileChange(file: string) {
      await rebuildIfRouteGraphChanged([file])
    },
  }
}

// --- production build ---

interface NativeBuildOptions {
  root: string
  platform: 'ios' | 'android'
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
      ...(entryFile ? [] : [nativeVirtualEntryPlugin(root, { dev }).plugin]),
      ...getNativePlugins(
        root,
        platform,
        viteImportGlobPlugin,
        dev,
        assetsDest,
        undefined,
        sourcemap,
        userPlugins
      ),
      // last, so it sees what every other plugin produced
      nativeBundlePostProcessPlugin(),
    ],
    output: getNativeOutputOptions(prelude, sourcemap, minify),
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
}

function nativeVirtualEntryPlugin(
  root: string,
  opts?: { dev?: boolean }
): { plugin: Plugin; routes: NativeRouteRegistry } {
  const isDev = opts?.dev !== false
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
    // resolve which file to use for ios (covers both formats)
    const file = typeof sf === 'string' ? sf : 'native' in sf ? sf.native : sf.ios
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

  const entryCode = `
${refreshSetup}
import * as ReactNativeInitializeCore from 'react-native/Libraries/Core/InitializeCore';
import NativeWebSocket from 'react-native/Libraries/WebSocket/WebSocket';
${setupFileImport}
import { createApp } from 'one';

void ReactNativeInitializeCore;
globalThis.WebSocket = NativeWebSocket;

var _routes = import.meta.glob(${JSON.stringify(routeGlobs)}, { exhaustive: true });
// fix route keys: One expects '/${routerRoot}/...' prefix but import.meta.glob returns './${routerRoot}/...'
var routes = {};
Object.keys(_routes).forEach(function(key) {
  var normalizedKey = key.replace(/^\\.\\//, '');
  routes['/' + normalizedKey] = _routes[key];
});

// React Native reloads a dev bundle in the existing JS runtime. Advance One's
// route-cache version so a full route-map build cannot reuse the previous
// import.meta.glob context after a route is added or removed.
globalThis.__vxrnVersion = (globalThis.__vxrnVersion || 0) + 1;

createApp({
  routes: routes,
  routerRoot: ${JSON.stringify(routerRoot)},
  flags: ${JSON.stringify(flags)},
  linking: ${JSON.stringify(linking)},
});
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
  const routes: NativeRouteRegistry = {
    routeRoot,
    files: new Set(),
    isRouteFile,
  }

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
        // rolldown expands `import.meta.glob` during transform and records a
        // dependency on the files it matched, never on the directories it
        // searched. registering those directories is what makes its own watcher
        // report a route file appearing, and walking them is what lets the
        // engine tell that report apart from an edit.
        //
        // watching a directory is not recursive, so every directory under the
        // route root is registered. a new subdirectory is itself a change to
        // its watched parent, and the full build that follows re-runs this
        // hook, so the build that picks up `app/foo/index.tsx` is also what
        // starts watching `app/foo`.
        routes.files.clear()
        const walkRouteRoot = (dir: string) => {
          this.addWatchFile(dir)
          for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const child = resolve(dir, entry.name)
            if (entry.isDirectory()) walkRouteRoot(child)
            else if (isRouteFile(child)) routes.files.add(normalizePath(child))
          }
        }
        // a project can have no route root at all: `import.meta.glob` then
        // expands to nothing and the app builds fine. watch the directory that
        // would hold it, so creating it is the change that starts the walk.
        if (statSync(routeRoot, { throwIfNoEntry: false })?.isDirectory()) {
          walkRouteRoot(routeRoot)
        } else {
          this.addWatchFile(dirname(routeRoot))
        }
        return entryCode
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
 * Pipe files through @vxrn/compiler's babel transforms.
 * Handles reanimated worklet compilation, async generator downleveling,
 * react-native codegen, react compiler, and react-refresh (dev only) —
 * same pipeline as metro, single babel pass per file.
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
        environment: platform as 'ios' | 'android',
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
        const compilerTarget =
          (babelOptions!.plugins![compilerPluginIndex] as any[])[1]?.target ?? '19'
        const compilerOut = await compiler.transformOxcReactCompiler(
          id,
          curCode,
          compilerTarget,
          sourceMaps
        )
        if (compilerOut?.code) {
          curCode = compilerOut.code
          if (sourceMaps && compilerOut.map) intermediateMaps.push(compilerOut.map)
        }
        babelOptions!.plugins!.splice(compilerPluginIndex, 1)
        if (babelOptions!.plugins!.length === 0) babelOptions = null
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
          if (babelOptions.plugins.length === 0) babelOptions = null
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

        const fft = await import('fast-flow-transform')
        const result = await fft.default({
          filename: id,
          source: code,
          sourcemap: true,
          dialect: 'flow',
          format: 'pretty',
        })
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

        const code = `module.exports = require('react-native/Libraries/Image/AssetRegistry').registerAsset(${JSON.stringify(assetData)});`

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
      const dims = imageSize(files[0])
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
 * Transforms class properties and private fields that Hermes doesn't support.
 * Inspired by rollipop's swc-plugin.ts.
 */
export function hermesCompatSWCPlugin(dev: boolean, sourceMaps = false): Plugin {
  let oxc: typeof import('oxc-transform') | null = null

  return {
    name: 'vxrn:hermes-compat',
    async transform(code, id) {
      if (!/\.[cm]?[jt]sx?$/.test(id)) return
      if (id.includes('\0') || id.includes('virtual:')) return
      // skip files that don't need transformation
      const hasClass = code.includes('class ') || code.includes('class{')
      const hasAsync = code.includes('async')
      const hasBlockScopedLoop = /\bfor\s*\(\s*(?:const|let)\b/.test(code)
      if (!hasClass && !hasAsync && !hasBlockScopedLoop) return
      let output: { code: string; map?: any } | undefined
      // keep the existing oxc limit for large prebuilt files. async lowering
      // below has no size exemption and runs after the worklet transform.
      if (code.length <= 500_000) {
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
      const lowered = await transformHermesAsync(output?.code ?? code, id, sourceMaps)
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

    if (globalThis.globalEvalWithSourceUrl) globalThis.globalEvalWithSourceUrl(code);
    else (0, eval)(code);

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

  reload() {
    var proxy = globalThis.__turboModuleProxy
      ? globalThis.__turboModuleProxy('DevSettings')
      : globalThis.nativeModuleProxy && globalThis.nativeModuleProxy.DevSettings;
    if (proxy && proxy.reload) proxy.reload();
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
            runtime.reload();
          }
        } else if (message.type === 'hmr:reload') {
          runtime.reload();
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
