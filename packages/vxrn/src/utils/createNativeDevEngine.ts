/**
 * Creates a rolldown DevEngine for native React Native bundle serving.
 * Uses rolldown's experimental dev() API with ESM output.
 *
 * Inspired by rollipop's architecture:
 * https://github.com/leegeunhyeok/rollipop
 */

import { basename, dirname, extname, join, relative, resolve } from 'node:path'
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import type { InputOptions, OutputOptions, Plugin, RolldownOutput } from 'rolldown'
import { normalizePath } from 'vite'
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
  'transform-class-properties',
  'transform-class-static-block',
  'transform-private-methods',
  'transform-private-property-in-object',
] as const

// prod-only: needed for hermesc bytecode AOT compilation, not the dev interpreter
const HERMES_PROD_TRANSFORMS = ['transform-async-to-generator'] as const

/** SWC `env.include` for Hermes-compatible downleveling; see HERMES_CLASS_TRANSFORMS. */
export function getHermesSWCIncludes(dev: boolean): string[] {
  return [...HERMES_CLASS_TRANSFORMS, ...(dev ? [] : HERMES_PROD_TRANSFORMS)]
}

interface NativeDevEngineOptions {
  root: string
  port: number
  host?: string
  platform: 'ios' | 'android'
  serverUrl?: string
  plugins?: Plugin[]
  onHmrUpdate?: (update: { type: string; code?: string }) => void
}

interface NativeDevEngineResult {
  engine: any
  getBundle: () => Promise<{ code: string; map?: string }>
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
    conditionNames: ['react-native', 'import', 'require', 'default'],
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

  // load .env files for VITE_* variables (mirrors what Vite does)
  const envDefines = (() => {
    const defines: Record<string, string> = {}
    try {
      const mode = dev ? 'development' : 'production'
      // load .env, .env.local, .env.[mode], .env.[mode].local (same order as Vite)
      for (const envFile of [
        '.env',
        '.env.local',
        `.env.${mode}`,
        `.env.${mode}.local`,
      ]) {
        const envPath = join(root, envFile)
        if (!existsSync(envPath)) continue
        const content = readFileSync(envPath, 'utf8')
        for (const line of content.split('\n')) {
          const match = line.match(/^\s*(VITE_\w+)\s*=\s*(.*)$/)
          if (match) {
            const [, key, rawVal] = match
            const val = rawVal.replace(/^['"]|['"]$/g, '').trim()
            defines[`import.meta.env.${key}`] = JSON.stringify(val)
            defines[`process.env.${key}`] = JSON.stringify(val)
          }
        }
      }
    } catch {}
    return defines
  })()

  const mode = dev ? 'development' : 'production'

  // build the full import.meta.env object for when it's used as a whole (e.g. JSON.stringify(import.meta.env))
  const envObject: Record<string, any> = {
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
  // add VITE_* from .env files
  for (const [key, val] of Object.entries(envDefines)) {
    const match = key.match(/^import\.meta\.env\.(.+)$/)
    if (match) {
      try {
        envObject[match[1]] = JSON.parse(val as string)
      } catch {
        envObject[match[1]] = val
      }
    }
  }

  return {
    jsx: {
      // use 'classic' mode (babel plugin-transform-react-jsx)
      // 'automatic' has files where jsxDEV import fails to resolve
      runtime: 'classic' as const,
    },
    define: {
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
      ...envDefines,
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
  assetsDest?: string
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
    vxrnCompilerPlugin(platform, dev),
    // strip Flow from any react-native / @react-native `.js` the compiler didn't
    // handle, the guaranteed safety net before rolldown's oxc core parse (which
    // can't parse Flow). now downstream of the compiler, so codegen sees the types.
    flowStripPlugin(),
    // guard undefined native methods in NativeAnimatedHelper
    nativeAnimatedGuardPlugin(),
    // handle asset imports (.png, .jpg, .ttf, etc.)
    assetPlugin({ root, platform, assetsDest }),
    // hermes compat: transform class properties and private fields
    hermesCompatSWCPlugin(dev),
  ]
}

// shared output options for native builds
function getNativeOutputOptions(prelude: string): OutputOptions {
  return {
    format: 'esm',
    sourcemap: true,
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
function postProcessNativeBundle(code: string): string {
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

  const open = ';(function() {\n'
  const close = '\n})();\n'

  // keep the sourceMappingURL comment as the final line if present
  const sm = code.match(/\n\/\/# sourceMappingURL=[^\n]*\s*$/)
  if (sm) {
    const smIdx = code.lastIndexOf(sm[0])
    return code.slice(0, idx) + open + code.slice(idx, smIdx) + close + code.slice(smIdx)
  }
  return code.slice(0, idx) + open + code.slice(idx) + close
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

  try {
    const swc = await import('@swc/core')
    const result = await swc.transform(runtimeSection, {
      filename: 'rolldown-runtime.js',
      configFile: false,
      swcrc: false,
      sourceMaps: false,
      inputSourceMap: false,
      isModule: false,
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
    return code.slice(0, startIdx) + result.code + code.slice(runtimeEnd)
  } catch (err) {
    console.warn('[vxrn] downlevelClassFieldsInBundle failed, returning original:', err)
    return code
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

  let currentBundle: { code: string; map?: string } | null = null
  let bundleResolve: ((value: any) => void) | null = null
  let bundlePromise: Promise<any> | null = null

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
      ...getNativePlugins(root, platform, viteImportGlobPlugin, true),
      ...userPlugins,
    ],
  }

  const outputOptions: OutputOptions = {
    ...getNativeOutputOptions(prelude),
    // connect HMR WebSocket using RN's WebSocket module (not the global)
    outro: `
try {
  var __WS = (init_WebSocket(), __toCommonJS(WebSocket_exports)).default;
  var __hmrUrl = 'ws://${resolvedHost}:${port}/hot';
  var __hmrWS = new __WS(__hmrUrl);
  __hmrWS.onmessage = function(event) {
    try {
      var msg = JSON.parse(event.data);
      var g = typeof global !== 'undefined' ? global : globalThis;
      if (msg.type === 'hmr:update' && msg.code) {
        if (g.globalEvalWithSourceUrl) g.globalEvalWithSourceUrl(msg.code);
        else (0, eval)(msg.code);
        setTimeout(function() {
          try { if (g.__ReactRefresh) g.__ReactRefresh.performReactRefresh(); } catch(e) {}
        }, 50);
      } else if (msg.type === 'hmr:reload') {
        var ds = g.__turboModuleProxy ? g.__turboModuleProxy('DevSettings') : null;
        if (ds && ds.reload) ds.reload();
      }
    } catch(e) { console.error('[vxrn] HMR eval error:', e); }
  };
  __hmrWS.onopen = function() {
    if (typeof __rolldown_runtime__ !== 'undefined' && __rolldown_runtime__.setup) {
      __rolldown_runtime__.setup(__hmrWS, __hmrUrl.replace('ws://', 'http://'));
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
        return
      }

      const output = result as RolldownOutput
      const chunk = output.output.find((o) => o.type === 'chunk' && o.isEntry)
      if (chunk && 'code' in chunk) {
        let code = postProcessNativeBundle(chunk.code)

        // downlevel class fields from the rolldown runtime (virtual module
        // skipped by the per-file SWC plugin) so old Hermes can parse them
        code = await downlevelClassFieldsInBundle(code)

        // wrap module code in a function scope so top-level `var`s (e.g. RN
        // fetch.js's `Headers`/`Request`) don't leak as non-configurable
        // globals and break RN's polyfillGlobal (dev-only redbox). see fn doc.
        code = wrapNativeBundleModuleScope(code)

        currentBundle = {
          code,
          map: chunk.map?.toString(),
        }
        console.info(
          `[vxrn] native bundle ready (${Math.round(chunk.code.length / 1024)}KB)`
        )
        if (bundleResolve) {
          bundleResolve(currentBundle)
          bundleResolve = null
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
      const updates = (result as any).updates || []
      for (const item of updates) {
        const update = item.update || item
        if (update.type === 'Patch' && update.code) {
          onHmrUpdate?.({ type: 'hmr:update', code: update.code })
        } else if (update.type === 'FullReload') {
          onHmrUpdate?.({ type: 'hmr:reload' })
        }
      }

      if (updates.length === 0) {
        onHmrUpdate?.({ type: 'hmr:reload' })
      }
    },

    rebuildStrategy: 'auto',
    watch: {},
  })

  await engine.run()

  // modules are registered via WebSocket messages from the HMR client
  // (the devMode runtime sends hmr:module-registered messages)

  return {
    engine,

    async getBundle() {
      if (currentBundle) return currentBundle
      if (!bundlePromise) {
        let timeoutId: ReturnType<typeof setTimeout>
        bundlePromise = new Promise((resolve, reject) => {
          bundleResolve = (value) => {
            clearTimeout(timeoutId)
            resolve(value)
          }
          timeoutId = setTimeout(
            () => reject(new Error('[vxrn] bundle build timed out after 120s')),
            120_000
          )
        })
      }
      await engine.ensureLatestBuildOutput()
      if (currentBundle) return currentBundle
      return bundlePromise
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
    shimMissingExports: true,
    moduleTypes: { '.js': 'jsx' },
    plugins: [
      ...(entryFile ? [] : [nativeVirtualEntryPlugin(root, { dev })]),
      ...getNativePlugins(root, platform, viteImportGlobPlugin, dev, assetsDest),
      ...userPlugins,
    ],
    output: getNativeOutputOptions(prelude),
  })
  const chunk = result.output.find((o) => o.type === 'chunk' && o.isEntry)

  if (!chunk || !('code' in chunk)) {
    throw new Error('[vxrn] production build produced no output')
  }

  let code = postProcessNativeBundle(chunk.code)
  code = await downlevelClassFieldsInBundle(code)
  return { code, map: chunk.map?.toString() }
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
function nativeAnimatedGuardPlugin(): Plugin {
  return {
    name: 'vxrn:native-animated-guard',
    transform(code, id) {
      if (!id.includes('animated/NativeAnimatedHelper')) return
      const target = 'const method = nullthrows(NativeAnimatedModule)[methodName];'
      if (!code.includes(target)) return
      return {
        code: code.replace(
          target,
          `const method = nullthrows(NativeAnimatedModule)[methodName];\n        if (typeof method !== 'function') return;`
        ),
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
export function vxrnCompilerPlugin(platform: string, dev: boolean): Plugin {
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

      try {
        if (!compiler) compiler = await import('@vxrn/compiler')

        const props = {
          id,
          code,
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
  import.meta.hot.accept(function() {
    if (globalThis.__ReactRefresh) {
      setTimeout(function() { globalThis.__ReactRefresh.performReactRefresh(); }, 30);
    }
  });
}
`
          }

          return { code: out }
        }
      } catch (err: any) {
        // log but don't crash — fallback to rolldown's own transform
        if (dev) {
          console.warn(`[vxrn:compiler] ${id}: ${err.message || err}`)
        }
        // if babel transform fails for a refresh candidate, still add accept boundary
        if (needsRefresh) {
          return {
            code: code + `\nif (import.meta.hot) { import.meta.hot.accept(); }\n`,
          }
        }
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

        try {
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
        } catch (err: any) {
          console.warn(`[vxrn:flow-strip] ${id}: ${err.message}`)
        }
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
}): Plugin {
  const assetRegex = new RegExp(`\\.(?:${DEFAULT_ASSET_EXTS.join('|')})$`)

  return {
    name: 'vxrn:asset',
    load: {
      async handler(id) {
        if (!assetRegex.test(id)) return

        const ext = extname(id).slice(1)
        const name = basename(id, `.${ext}`)
        const dir = dirname(id)
        const relativePath = relative(opts.root, id)
        // On Windows, change backslashes to slashes to get proper URL path from file path.
        const httpLocation = '/assets/' + dirname(relativePath).replace(/\\/g, '/')

        // simple asset registration (TODO: scale detection like rollipop)
        const assetData = {
          __packager_asset: true,
          name,
          type: ext,
          scales: [1],
          httpServerLocation: httpLocation,
          fileSystemLocation: dir,
          hash: '',
          width: undefined as number | undefined,
          height: undefined as number | undefined,
        }

        // try to get image dimensions
        if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(ext)) {
          try {
            const { imageSize } = await import('image-size')
            const dims = imageSize(id)
            assetData.width = dims.width
            assetData.height = dims.height
          } catch {}
        }

        if (opts.assetsDest) {
          const relativeAssetDir = dirname(relativePath).replace(/\\/g, '/')
          const assetDestDir = join(opts.assetsDest, 'assets', relativeAssetDir)
          mkdirSync(assetDestDir, { recursive: true })
          copyFileSync(id, join(assetDestDir, `${name}.${ext}`))
        }

        const code = `module.exports = require('react-native/Libraries/Image/AssetRegistry').registerAsset(${JSON.stringify(assetData)});`

        return { code, moduleType: 'js' as any }
      },
    },
  }
}

/**
 * SWC transform for Hermes compatibility.
 * Transforms class properties and private fields that Hermes doesn't support.
 * Inspired by rollipop's swc-plugin.ts.
 */
function hermesCompatSWCPlugin(dev: boolean): Plugin {
  let swc: typeof import('@swc/core') | null = null

  return {
    name: 'vxrn:hermes-compat',
    async transform(code, id) {
      if (!/\.[cm]?[jt]sx?$/.test(id)) return
      if (id.includes('\0') || id.includes('virtual:')) return
      // skip files that don't need transformation
      const hasClass = code.includes('class ') || code.includes('class{')
      const hasAsync = !dev && code.includes('async ')
      if (!hasClass && !hasAsync) return
      // skip very large prebuilt files
      if (code.length > 500_000) return

      try {
        if (!swc) swc = await import('@swc/core')

        // app modules: the Hermes class set (unconditional), plus async-to-generator
        // in prod only (see HERMES_CLASS_TRANSFORMS / HERMES_PROD_TRANSFORMS)
        const envIncludes = getHermesSWCIncludes(dev)

        const result = await swc.transform(code, {
          filename: id,
          configFile: false,
          swcrc: false,
          sourceMaps: false,
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
        return { code: result.code }
      } catch (err: any) {
        // don't crash on SWC transform errors (eg static blocks not supported)
      }
    },
  }
}

// --- HMR runtime ---

function getHmrRuntimeSource(): string {
  return `
// vxrn HMR runtime for rolldown devMode
var BaseDevRuntime = DevRuntime;

class ReactNativeDevRuntime extends BaseDevRuntime {
  constructor() {
    var _shared = { _socket: null, _queue: [] };
    var clientId = 'rn-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    super({ send: function(msg) {
      var s = JSON.stringify(msg);
      if (_shared._socket && _shared._socket.readyState === 1) { _shared._socket.send(s); }
      else { _shared._queue.push(s); }
    }}, clientId);
    this._shared = _shared;
    this._socket = null;
    this._queue = [];
    this.moduleHotContexts = {};
  }

  createModuleHotContext(moduleId) {
    var ctx = {
      acceptCallbacks: [],
      accept: function(cb) {
        if (cb) ctx.acceptCallbacks.push({ deps: [moduleId], fn: cb });
      },
      invalidate: function() {},
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

  applyUpdates(boundaries) {
    for (var i = 0; i < boundaries.length; i++) {
      var moduleId = boundaries[i][0];
      var ctx = this.moduleHotContexts[moduleId];
      if (ctx && ctx.acceptCallbacks) {
        for (var j = 0; j < ctx.acceptCallbacks.length; j++) {
          ctx.acceptCallbacks[j].fn(this.modules[moduleId].exports);
        }
      }
      // surface each committed module id to the framework hot-update hook (if one
      // is registered). RN's React Refresh can't repaint frameworks that re-wrap
      // route components away from the edited module's Refresh family (e.g. One),
      // and the web route-update event has no equivalent on the native /hot
      // socket, so this generic vxrn global is the bridge.
      try {
        if (globalThis.__VXRN_ON_MODULE_UPDATED__ && moduleId) globalThis.__VXRN_ON_MODULE_UPDATED__(moduleId);
      } catch (error) {
        console.error('[vxrn HMR]: module update hook failed', error);
      }
    }
  }

  setup(socket, origin) {
    if (this._socket) return;
    this._socket = socket;
    // also set the shared messenger socket so queued messages can flush
    if (this._shared) this._shared._socket = socket;

    var flushQueues = function() {
      // flush messenger queue
      if (this._shared && this._shared._queue.length) {
        for (var i = 0; i < this._shared._queue.length; i++) socket.send(this._shared._queue[i]);
        this._shared._queue = [];
      }
      // flush instance queue
      for (var i = 0; i < this._queue.length; i++) socket.send(this._queue[i]);
      this._queue = [];
    }.bind(this);

    if (socket.readyState === 1) {
      flushQueues();
    } else {
      socket.addEventListener('open', function() {
        flushQueues();
      }, { once: true });
    }

    // HMR message handling is done by the outro WebSocket handler
    // the runtime's setup() only needs to flush queued messages
  }
}

globalThis.__rolldown_runtime__ = new ReactNativeDevRuntime();
`
}
