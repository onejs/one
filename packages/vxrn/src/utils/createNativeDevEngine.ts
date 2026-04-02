/**
 * Creates a rolldown DevEngine for native React Native bundle serving.
 * Uses rolldown's experimental dev() API with ESM output.
 *
 * Inspired by rollipop's architecture:
 * https://github.com/leegeunhyeok/rollipop
 */

import { basename, dirname, extname, join, relative, resolve } from 'node:path'
import { existsSync, readFileSync } from 'node:fs'
import type { InputOptions, OutputOptions, Plugin, RolldownOutput } from 'rolldown'
import { DEFAULT_ASSET_EXTS } from '../constants/defaults'
import { getNativePrelude } from '../runtime/native-prelude'

// files that contain Flow syntax and need stripping
const FLOW_FILE_PATTERN = /node_modules[\\/](?:react-native|@react-native)[\\/].*\.js$/

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
function getNativeTransformConfig(
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
  dev: boolean
): Plugin[] {
  return [
    // plugins provided by One (clientTreeShakePlugin for loader removal, etc.)
    ...(globalThis.__vxrnAddNativePlugins || []),
    // block .server.* and _middleware.* files from entering the native bundle
    serverFileExclusionPlugin(),
    // guard server-only / client-only / web-only / native-only imports
    environmentGuardPlugin(),
    // stub CSS imports — native doesn't support CSS and rolldown removed CSS bundling
    cssStubPlugin(),
    // handle import.meta.glob (used by One's route system)
    viteImportGlobPlugin({ root }),
    // strip Flow types from react-native and @react-native packages
    flowStripPlugin(),
    // fix: make TurboModuleRegistry read __turboModuleProxy lazily
    nativeModuleProxyFixPlugin(),
    // handle asset imports (.png, .jpg, .ttf, etc.)
    assetPlugin({ root, platform }),
    // @vxrn/compiler babel transforms: reanimated worklets, async generators,
    // react-native codegen, react compiler — same pipeline as metro
    vxrnCompilerPlugin(platform, dev),
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
  // rolldown devMode runtime leaves some raw import.meta.hot references
  // that aren't compiled through the normal plugin pipeline.
  code = code.replace(/^if \(import\.meta\.hot\).*$/gm, '')

  return code
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
        include: [
          'transform-class-properties',
          'transform-class-static-block',
          'transform-private-methods',
          'transform-private-property-in-object',
        ],
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

        // register a no-op HMRClient so RN's native side doesn't error when calling HMRClient.setup()
        // our actual HMR is handled via the outro WebSocket connection
        const hmrClientStub = `registerCallableModule("HMRClient",{setup:function(){},enable:function(){},disable:function(){},registerBundle:function(){},log:function(){}})`
        code = code.replace(
          /registerCallableModule\s*\(\s*["']AppRegistry["']/,
          (match) => hmrClientStub + ',' + match
        )

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
  plugins?: Plugin[]
}

export async function buildNativeBundle(
  options: NativeBuildOptions
): Promise<{ code: string; map?: string }> {
  const { root, platform, dev = false, serverUrl, plugins: userPlugins = [] } = options

  const { build } = await import('rolldown')
  const { viteImportGlobPlugin } = await import('rolldown/experimental')

  const prelude = getNativePrelude({
    dev,
    platform,
    serverUrl,
  })

  const result = await build({
    input: VIRTUAL_NATIVE_ENTRY,
    cwd: root,
    platform: 'neutral',
    resolve: getNativeResolveConfig(platform),
    transform: getNativeTransformConfig(platform, dev, root),
    treeshake: !dev,
    shimMissingExports: true,
    moduleTypes: { '.js': 'jsx' },
    plugins: [
      nativeVirtualEntryPlugin(root, { dev }),
      ...getNativePlugins(root, platform, viteImportGlobPlugin, dev),
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
  // resolve to an absolute path rooted in the project so import.meta.glob('./app/...') resolves correctly
  const resolvedId = resolve(root, '__virtual-native-entry.tsx')

  // read config passed from One's vite plugin via globalThis
  const entryConfig = (globalThis as any).__vxrnNativeEntryConfig || {}
  const routerRoot = entryConfig.routerRoot || 'app'
  const flags = entryConfig.flags || {}

  // build setupFile import (static import for native)
  const setupFileImport = (() => {
    const sf = entryConfig.setupFile
    if (!sf) return ''
    // resolve which file to use for ios (covers both formats)
    const file = typeof sf === 'string' ? sf : 'native' in sf ? sf.native : sf.ios
    if (!file) return ''
    const resolved = resolve(root, file)
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
${setupFileImport}
import { createApp } from 'one';

var _routes = import.meta.glob(${JSON.stringify(routeGlobs)}, { exhaustive: true });
// fix route keys: One expects '/${routerRoot}/...' prefix but import.meta.glob returns './${routerRoot}/...'
var routes = {};
Object.keys(_routes).forEach(function(key) {
  routes[key.replace(/^\\./, '')] = _routes[key];
});

createApp({
  routes: routes,
  routerRoot: ${JSON.stringify(routerRoot)},
  flags: ${JSON.stringify(flags)},
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
 * Fix NativeAnimatedModule resolution in rolldown bundles.
 * Rolldown's module init order can cause both NativeAnimatedModule variants
 * to resolve to null. This patches the source to re-resolve from the turbo
 * proxy at runtime when the standard resolution fails.
 */
/**
 * Fix TurboModuleRegistry to read __turboModuleProxy lazily.
 * In rolldown's concatenated bundle, TurboModuleRegistry can capture
 * global.__turboModuleProxy at module scope before native sets it,
 * causing all turbo module lookups to silently return null.
 * Also filters empty stub objects from nativeModuleProxy fallback.
 */
function nativeModuleProxyFixPlugin(): Plugin {
  return {
    name: 'vxrn:native-module-proxy-fix',
    transform(code, id) {
      if (!id.includes('TurboModule/TurboModuleRegistry')) return
      if (!code.includes('turboModuleProxy')) return

      return {
        code: code
          // remove the eager module-scope capture
          .replace(
            /const turboModuleProxy = global\.__turboModuleProxy;?/,
            '// vxrn: removed eager capture — read lazily in requireModule'
          )
          // make requireModule read proxy fresh + filter plain empty objects
          .replace(
            /function requireModule[^{]*\{/,
            `$&
  // vxrn: read turbo proxy lazily so rolldown init order doesn't matter
  var turboModuleProxy = global.__turboModuleProxy;`
          )
          // filter empty plain-object stubs from nativeModuleProxy.
          // on bridgeless iOS, nativeModuleProxy returns {} for missing modules.
          // plain {} has Object.prototype, while real JSI host objects don't.
          .replace(
            /(const legacyModule[^=]*= NativeModules\[name\];?)/,
            `$1
    if (legacyModule != null && Object.getPrototypeOf(legacyModule) === Object.prototype) return null;`
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
 * Stub CSS imports for native builds.
 * Native doesn't support CSS and rolldown removed CSS bundling support.
 * Without this, any `import './foo.css'` will cause a build error.
 */
function cssStubPlugin(): Plugin {
  return {
    name: 'vxrn:css-stub',
    load: {
      handler(id) {
        if (/\.css$/.test(id)) {
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
function vxrnCompilerPlugin(platform: string, dev: boolean): Plugin {
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
            plugins: [...existingPlugins, 'react-refresh/babel'],
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
function assetPlugin(opts: { root: string; platform: string }): Plugin {
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
        const httpLocation = '/assets/' + dirname(relativePath)

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

        // hermes needs class properties downleveled; prod also needs
        // classes and async-to-generator for bytecode compilation
        const envIncludes = [
          'transform-class-properties',
          'transform-class-static-block',
          'transform-private-methods',
          'transform-private-property-in-object',
          ...(!dev ? ['transform-classes', 'transform-async-to-generator'] : []),
        ]

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
