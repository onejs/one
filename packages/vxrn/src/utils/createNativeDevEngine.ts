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
  readFileSync,
} from 'node:fs'
import { pathToFileURL } from 'node:url'
import type { InputOptions, OutputOptions, Plugin, RolldownOutput } from 'rolldown'
import type { DevEngine } from 'rolldown/experimental'
import { loadEnv as loadViteEnv, normalizePath } from 'vite'
import { DEFAULT_ASSET_EXTS } from '../constants/defaults'
import { getNativePrelude } from '../runtime/native-prelude'

// files that contain Flow syntax and need stripping
const FLOW_FILE_PATTERN = /node_modules[\\/](?:react-native|@react-native)[\\/].*\.js$/

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
  | { type: 'hmr:reload'; clientId: string }
  | { type: 'hmr:error' }

interface NativeDevEngineResult {
  engine: DevEngine
  getBundle: () => Promise<{ code: string }>
  getAsset: (pathname: string, hash?: string) => NativeDevAsset | undefined
  close: () => Promise<void>
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
  platform: string,
  viteImportGlobPlugin: any,
  dev: boolean,
  assetsDest?: string,
  onAsset?: (asset: NativeAssetData) => void,
  sourceMaps = false
): Plugin[] {
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
  ]
}

// shared output options for native builds
function getNativeOutputOptions(prelude: string, sourcemap: boolean): OutputOptions {
  return {
    format: 'esm',
    sourcemap,
    intro: prelude,
    codeSplitting: false,
    strictExecutionOrder: true,
  }
}

/**
 * Post-process a native bundle to fix rolldown devMode output quirks.
 * Most concerns have been moved to plugins/config:
 * - VXRN_REACT_19 → handled by define in getNativeTransformConfig
 * - DevSettings stripping → stripDevSettingsPlugin
 */
export function normalizeNativeCommonJSInterop(code: string): string {
  // Rolldown can mark ESM default imports from internal CommonJS modules as
  // Node-mode conversions in both dev and production. Babel CommonJS packages
  // expose their actual default behind `exports.default`; Node mode instead
  // returns the whole exports object and React receives `{ default: Component }`.
  return code.replace(
    /(\b__toESM(?:\$\d+)?\(\s*require[\w$]*\(\)\s*),\s*1(\s*\))/g,
    '$1$2'
  )
}

function postProcessNativeBundle(code: string): string {
  code = normalizeNativeCommonJSInterop(code)

  // Rolldown replaces import.meta.env reads but can leave a guarding
  // `typeof import.meta` expression behind. Hermes rejects import.meta syntax
  // even when the other side of the condition has already folded to false.
  code = code.replace(/\btypeof\s+import\.meta\b/g, '"object"')

  // rolldown devMode still emits ESM export statements that hermes can't parse.
  // this is a rolldown behavior we can't configure away yet.
  code = code.replace(/^\s*export\s*\{[^}]*\}\s*;?\s*$/gm, '')
  code = code.replace(/^\s*export\s+default\s+([^;\n]+);?\s*$/gm, '$1;')
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
            code =
              code.slice(0, beforeMarker) +
              'NativeAnimatedModule = NativeAnimatedModule_default ?? NativeAnimatedTurboModule_default;' +
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

  return code.slice(0, idx) + ';(function() {\n' + code.slice(idx) + '\n})();\n'
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

  const swc = await import('@swc/core')
  const result = await swc.transform(runtimeSection, {
    filename: 'rolldown-runtime.js',
    configFile: false,
    swcrc: false,
    sourceMaps: false,
    inputSourceMap: false,
    isModule: false,
    // Compact only Rolldown's generated runtime, then restore its original
    // newline count below. This keeps every application module at the exact
    // generated line recorded by Rolldown's source map while still lowering
    // runtime class fields for Hermes.
    minify: true,
    env: {
      targets: { node: 9999 },
      // dev-only runtime prelude: the class set only, no prod bytecode transforms
      include: [...HERMES_CLASS_TRANSFORMS],
    },
    jsc: {
      parser: { syntax: 'ecmascript' },
      transform: { react: { runtime: 'preserve' } },
      externalHelpers: false,
      assumptions: {
        setPublicClassFields: true,
        privateFieldsAsProperties: true,
      },
    },
  })
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

  let currentBundle: { code: string } | null = null
  let firstBuildError: Error | null = null
  let bundleResolve: ((value: { code: string }) => void) | null = null
  let bundleReject: ((error: Error) => void) | null = null
  let bundlePromise: Promise<{ code: string }> | null = null

  const resolvedHost = host === '0.0.0.0' ? 'localhost' : host

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
      nativeVirtualEntryPlugin(root, { dev: true }),
      ...getNativePlugins(
        root,
        platform,
        viteImportGlobPlugin,
        true,
        undefined,
        assetRegistry.register,
        false
      ),
      ...userPlugins,
    ],
  }

  const outputOptions: OutputOptions = {
    // no dev sourcemap: nothing consumes one. the bundle handler serves .code and
    // /symbolicate isn't implemented, and the map wouldn't line up anyway — the
    // served code is post-processed (runtime downleveling, IIFE wrap) after the
    // map is generated. generating it cost ~90ms and ~250MB RSS per rebuild on a
    // 6MB bundle, held for the life of the dev server, per platform.
    ...getNativeOutputOptions(prelude, false),
    // connect HMR WebSocket using RN's WebSocket module (not the global)
    outro: `
try {
  var __WS = (init_WebSocket(), __toCommonJS(WebSocket_exports)).default;
  var __hmrUrl = 'ws://${resolvedHost}:${port}/hot?platform=${platform}&clientId=' + encodeURIComponent(__rolldown_runtime__.clientId);
  var __hmrWS = new __WS(__hmrUrl);
  __hmrWS.onmessage = function(event) {
    try {
      var msg = JSON.parse(event.data);
      var g = typeof global !== 'undefined' ? global : globalThis;
      if (msg.type === 'hmr:update' && msg.code) {
        var applied = __rolldown_runtime__.applyHmrUpdate(msg.code, msg.changedIds, msg.seq);
        if (!applied) {
          var updateSettings = g.__turboModuleProxy ? g.__turboModuleProxy('DevSettings') : null;
          if (updateSettings && updateSettings.reload) updateSettings.reload();
        }
      } else if (msg.type === 'hmr:reload') {
        var ds = g.__turboModuleProxy ? g.__turboModuleProxy('DevSettings') : null;
        if (ds && ds.reload) ds.reload();
      }
    } catch(e) { console.error('[vxrn] HMR eval error:', e); }
  };
  __hmrWS.onopen = function() {
    if (typeof __rolldown_runtime__ !== 'undefined' && __rolldown_runtime__.setup) {
      __rolldown_runtime__.setup(__hmrWS);
    }
  };
  __hmrWS.onerror = function(e) { console.warn('[vxrn] HMR connection error:', e.message || e); };
} catch(e) {}
`,
  }

  const engine = await dev(inputOptions, outputOptions, {
    onOutput: async (result) => {
      if (result instanceof Error) {
        console.error('[vxrn] native bundle error:', result.message)
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

        // wrap module code in a function scope so top-level `var`s (e.g. RN
        // fetch.js's `Headers`/`Request`) don't leak as non-configurable
        // globals and break RN's polyfillGlobal (dev-only redbox). see fn doc.
        code = wrapNativeBundleModuleScope(code)

        currentBundle = { code }
        console.info(`[vxrn] native bundle ready (${Math.round(code.length / 1024)}KB)`)
        if (bundleResolve) {
          bundleResolve(currentBundle)
          bundleResolve = null
          bundleReject = null
          bundlePromise = null
        }
      }
    },

    onHmrUpdates: async (result) => {
      if (result instanceof Error) {
        console.error('[vxrn] HMR error:', result.message)
        onHmrUpdate?.({ type: 'hmr:error' })
        return
      }
      for (const { clientId, update } of result.updates) {
        if (update.type === 'Patch' && update.code) {
          onHmrUpdate?.({
            type: 'hmr:update',
            clientId,
            code: update.code,
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

  await engine.run()

  return {
    engine,

    async getBundle() {
      // a runtime invalidation marks the full output stale before reloading. pull
      // that output before serving the cached bundle to the restarted app.
      await engine.ensureLatestBuildOutput()
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
      ...(entryFile ? [] : [nativeVirtualEntryPlugin(root, { dev })]),
      ...getNativePlugins(
        root,
        platform,
        viteImportGlobPlugin,
        dev,
        assetsDest,
        undefined,
        sourcemap
      ),
      ...userPlugins,
    ],
    output: getNativeOutputOptions(prelude, sourcemap),
  })
  const chunk = result.output.find((o) => o.type === 'chunk' && o.isEntry)

  if (!chunk || !('code' in chunk)) {
    throw new Error('[vxrn] production build produced no output')
  }

  let code = postProcessNativeBundle(chunk.code)
  code = await downlevelClassFieldsInBundle(code)
  // Per-module Babel/SWC transforms return maps when requested, and the
  // generated-runtime downlevel pass preserves its input line count. The
  // remaining post-processing replaces syntax in place, so application frames
  // retain Rolldown's generated line and compose back to original source.
  return { code, map: sourcemap ? chunk.map?.toString() : undefined }
}

const VIRTUAL_NATIVE_ENTRY = 'virtual:native-entry'

function nativeVirtualEntryPlugin(root: string, opts?: { dev?: boolean }): Plugin {
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

createApp({
  routes: routes,
  routerRoot: ${JSON.stringify(routerRoot)},
  flags: ${JSON.stringify(flags)},
  linking: ${JSON.stringify(linking)},
});
`

  return {
    name: 'vxrn:native-virtual-entry',
    resolveId(id) {
      if (id === VIRTUAL_NATIVE_ENTRY) {
        return resolvedId
      }
    },
    load(id) {
      if (id === resolvedId) {
        return entryCode
      }
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

      if (needsRefresh) {
        // merge react-refresh/babel into the existing plugins (or create new options)
        const existingPlugins = babelOptions?.plugins || []
        babelOptions = {
          ...babelOptions,
          plugins: [
            ...existingPlugins,
            [
              'react-refresh/babel',
              {
                skipEnvCheck: true,
                refreshReg: '__vxrnRefreshReg',
                refreshSig: '__vxrnRefreshSig',
              },
            ],
          ],
        }
      }

      if (!babelOptions) return

      if (sourceMaps) {
        // Rolldown composes plugin maps in transform order. Without this map,
        // every module Babel changes is attributed only to Babel's generated
        // output, which makes production Hermes frames miss the original
        // source line even though the bundle command emits a `.map` file.
        babelOptions = {
          ...babelOptions,
          sourceMaps: true,
          sourceFileName: id,
        }
      }

      const result = await compiler.transformBabel(id, code, babelOptions)

      if (result?.code) {
        let out = result.code

        if (needsRefresh) {
          // wrap with per-file $RefreshReg$ that includes the file path as unique ID
          // and schedule performReactRefresh() after HMR patch re-execution
          const escapedId = id.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
          out = `
var __prevRefreshReg = globalThis.$RefreshReg$;
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

${out}

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
        }

        return { code: out, map: sourceMaps ? result.map : undefined }
      }
    },
  }
}

/**
 * Strip Flow types from react-native source files.
 * Uses hermes-parser which is already a dep of react-native.
 */
function flowStripPlugin(): Plugin {
  return {
    name: 'vxrn:flow-strip',
    transform: {
      async handler(code, id) {
        if (!FLOW_FILE_PATTERN.test(id)) return

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
  let swc: typeof import('@swc/core') | null = null

  return {
    name: 'vxrn:hermes-compat',
    async transform(code, id) {
      if (!/\.[cm]?[jt]sx?$/.test(id)) return
      if (id.includes('\0') || id.includes('virtual:')) return
      // skip files that don't need transformation
      const hasClass = code.includes('class ') || code.includes('class{')
      const hasAsync = code.includes('async ')
      const hasBlockScopedLoop = /\bfor\s*\(\s*(?:const|let)\b/.test(code)
      if (!hasClass && !hasAsync && !hasBlockScopedLoop) return
      // skip very large prebuilt files
      if (code.length > 500_000) return

      if (!swc) swc = await import('@swc/core')

      // app modules: the Hermes class and async sets in both modes.
      const envIncludes = getHermesSWCIncludes(dev)

      const result = await swc.transform(code, {
        filename: id,
        configFile: false,
        swcrc: false,
        // Return the transform-to-input map and let Rolldown compose it with
        // earlier plugin maps. `inputSourceMap` stays false deliberately:
        // feeding the prior map to SWC as well would compose it twice.
        sourceMaps,
        sourceFileName: sourceMaps ? id : undefined,
        inputSourceMap: false,
        env: {
          targets: { node: 9999 },
          include: envIncludes,
        },
        jsc: {
          parser: { syntax: 'typescript', tsx: true },
          transform: { react: { runtime: 'preserve' } },
          externalHelpers: false,
          assumptions: {
            setPublicClassFields: true,
            privateFieldsAsProperties: true,
          },
        },
        isModule: !id.endsWith('.cjs'),
      })
      return { code: result.code, map: sourceMaps ? result.map : undefined }
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

  setup(socket) {
    if (this._socket) return;
    this._socket = socket;
  }
}

globalThis.__rolldown_runtime__ = new ReactNativeDevRuntime();
`
}
