/**
 * Creates a rolldown DevEngine for native React Native bundle serving.
 * Uses rolldown's experimental dev() API with ESM output.
 *
 * Inspired by rollipop's architecture:
 * https://github.com/leegeunhyeok/rollipop
 */

import { writeFileSync } from 'node:fs'
import { basename, dirname, extname, join, relative } from 'node:path'
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
function getNativeTransformConfig(dev: boolean) {
  return {
    jsx: {
      // use 'classic' mode (babel plugin-transform-react-jsx)
      // 'automatic' has files where jsxDEV import fails to resolve
      runtime: 'classic' as const,
    },
    define: {
      'process.env.NODE_ENV': dev ? '"development"' : '"production"',
      'process.env.VXRN_REACT_19': 'false',
      __DEV__: dev ? 'true' : 'false',
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
    // stub CSS imports — native doesn't support CSS and rolldown removed CSS bundling
    cssStubPlugin(),
    // handle import.meta.glob (used by One's route system)
    viteImportGlobPlugin({ root }) as any,
    // strip Flow types from react-native and @react-native packages
    flowStripPlugin(),
    // handle asset imports (.png, .jpg, .ttf, etc.)
    assetPlugin({ root, platform }),
    // hermes compat: transform class properties, private fields, and classes (prod)
    hermesCompatSWCPlugin(dev),
    // react-native codegen for native component specs
    codegenPlugin(),
    // downgrade polyfill "not configurable" errors to warnings (hermes v1)
    polyfillErrorDowngradePlugin(),
    // strip DevSettings in prod (dev-only native module)
    stripDevSettingsPlugin(dev),
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
 * - polyfill error downgrade → polyfillErrorDowngradePlugin
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

  // generate a real entry file on disk (virtual modules can't use import.meta.glob)
  const entryFile = generateNativeEntry(root)

  let currentBundle: { code: string; map?: string } | null = null
  let bundleResolve: ((value: any) => void) | null = null
  let bundlePromise: Promise<any> | null = null

  const resolvedHost = host === '0.0.0.0' ? 'localhost' : host

  const inputOptions: InputOptions = {
    input: entryFile,
    cwd: root,
    platform: 'neutral',
    resolve: getNativeResolveConfig(platform),
    transform: getNativeTransformConfig(true),

    experimental: {
      devMode: { implement: hmrRuntimeSource, host, port },
      incrementalBuild: true,
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
      ...getNativePlugins(root, platform, viteImportGlobPlugin, true),

      // add import.meta.hot.accept() to user files for HMR boundaries
      // rolldown compiles import.meta.hot -> createModuleHotContext at build time
      nativeReactRefreshPlugin(),

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

  const entryFile = generateNativeEntry(root, { dev })

  const result = await build({
    input: entryFile,
    cwd: root,
    platform: 'neutral',
    resolve: getNativeResolveConfig(platform),
    transform: getNativeTransformConfig(dev),
    treeshake: !dev,
    shimMissingExports: true,
    moduleTypes: { '.js': 'jsx' },
    plugins: [
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

function generateNativeEntry(root: string, opts?: { dev?: boolean }): string {
  const isDev = opts?.dev !== false
  // write entry at project root so import.meta.glob('./app/...') resolves correctly
  const entryPath = join(root, '.vxrn-entry-native.tsx')

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
// auto-generated native entry for rolldown
${refreshSetup}
import { createApp } from 'one';

var _routes = import.meta.glob(['./app/**/*.tsx', './app/**/*.ts', '!./app/**/*+api.*', '!./app/**/*.test.*', '!./app/**/*.d.ts'], { exhaustive: true });
// fix route keys: One expects '/app/...' prefix but import.meta.glob returns './app/...'
var routes = {};
Object.keys(_routes).forEach(function(key) {
  routes[key.replace(/^\\./, '')] = _routes[key];
});

createApp({
  routes: routes,
  routerRoot: 'app',
  flags: {},
});
`
  writeFileSync(entryPath, entryCode)
  return entryPath
}

// --- plugins ---

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
      const hasAsyncGen = code.includes('async *') || code.includes('async*')
      const hasAsync = !dev && code.includes('async ')
      if (!hasClass && !hasAsync && !hasAsyncGen) return
      // skip very large prebuilt files
      if (code.length > 500_000) return

      try {
        if (!swc) swc = await import('@swc/core')

        // hermes doesn't support async generators (even in dev) and rejects
        // class declarations in prod bytecode compilation
        const envIncludes = [
          'transform-class-properties',
          'transform-class-static-block',
          'transform-private-methods',
          'transform-private-property-in-object',
          ...(!dev ? ['transform-classes', 'transform-async-to-generator'] : []),
        ]

        // for files with async generators, use a lower target so SWC
        // fully downlevels them (hermes doesn't support async generators)
        const result = await swc.transform(code, {
          filename: id,
          configFile: false,
          swcrc: false,
          sourceMaps: false,
          inputSourceMap: false,
          // hermes supports async/await but NOT async generators or for-await-of.
          // for files with those patterns, use es5 target to fully downlevel them
          // (this adds regenerator overhead only for those specific files)
          ...(hasAsyncIter
            ? {
                jsc: {
                  parser: { syntax: 'typescript', tsx: true },
                  target: 'es5',
                  transform: { react: { runtime: 'preserve' } },
                  externalHelpers: false,
                  assumptions: {
                    setPublicClassFields: true,
                    privateFieldsAsProperties: true,
                  },
                },
              }
            : {
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
              }),
          isModule: !id.endsWith('.cjs'),
        })
        return { code: result.code }
      } catch (err: any) {
        // don't crash on SWC transform errors (eg static blocks not supported)
      }
    },
  }
}

/**
 * Run @react-native/babel-plugin-codegen on native component spec files.
 * Without this, native components (RNSScreen, SafeAreaView, etc.) get
 * "Codegen didn't run" warnings and may not render correctly.
 */
function codegenPlugin(): Plugin {
  const NATIVE_COMPONENT_RE = /NativeComponent\.[jt]sx?$/
  const SPEC_FILE_RE = /[/\\]specs?[/\\]/

  return {
    name: 'vxrn:codegen',
    async transform(code, id) {
      if (!NATIVE_COMPONENT_RE.test(id) && !SPEC_FILE_RE.test(id)) return

      try {
        const babel = await import('@babel/core')
        const result = await babel.transformAsync(code, {
          filename: id,
          babelrc: false,
          configFile: false,
          compact: false,
          plugins: ['@react-native/babel-plugin-codegen'],
          sourceType: 'unambiguous',
        })
        if (result?.code) return { code: result.code }
      } catch {}
    },
  }
}

/**
 * Downgrade polyfill "not configurable" errors to warnings.
 * hermes v1 has native fetch/Headers/etc that are non-configurable,
 * so polyfill attempts throw errors that are noisy but harmless.
 */
function polyfillErrorDowngradePlugin(): Plugin {
  return {
    name: 'vxrn:polyfill-error-downgrade',
    transform(code, id) {
      if (!id.includes('node_modules')) return
      if (!code.includes('console.error("Failed to set polyfill.')) return

      return {
        code: code.replace(
          /console\.error\(\s*"Failed to set polyfill\.\s*"\s*\+/g,
          'console.warn("Failed to set polyfill. " +'
        ),
      }
    },
  }
}

/**
 * Strip DevSettings reference in production builds.
 * In production, NativeModules.getEnforcing('DevSettings') will fail
 * since DevSettings is a dev-only module.
 */
function stripDevSettingsPlugin(dev: boolean): Plugin {
  return {
    name: 'vxrn:strip-dev-settings',
    transform(code, id) {
      if (dev) return
      if (!code.includes('DevSettings')) return

      return {
        code: code.replace(
          /getEnforcing\s*\(\s*["']DevSettings["']\s*\)/g,
          'patched_getEnforcing_DevSettings_will_not_work_in_production()'
        ),
      }
    },
  }
}

/**
 * React Refresh wrapper for native HMR.
 * 1. Runs react-refresh/babel to add $RefreshReg$/$RefreshSig$ calls
 * 2. Wraps each file with per-module $RefreshReg$ that includes the file path
 *    (react-refresh needs unique IDs like "filepath ComponentName")
 * 3. Appends import.meta.hot.accept() for HMR boundaries
 * 4. Schedules performReactRefresh() after module re-execution
 */
function nativeReactRefreshPlugin(): Plugin {
  return {
    name: 'vxrn:react-refresh',
    async transform(code, id) {
      // only wrap user app files (not node_modules, not generated entry, not virtual)
      if (id.includes('node_modules')) return
      if (id.includes('.vxrn-entry-native')) return
      if (id.startsWith('\0')) return
      if (!/\.[tj]sx?$/.test(id)) return
      // skip files that clearly have no components (raw source before JSX transform)
      // check for JSX syntax (<), function keyword, or arrow functions (=>)
      if (!/[<]|function\s|=>\s*[{(]/.test(code)) return

      try {
        // run react-refresh/babel to add $RefreshReg$ and $RefreshSig$
        const babel = await import('@babel/core')

        // babel needs parser plugins for TypeScript/JSX
        const parserPlugins: any[] = []
        if (id.endsWith('.tsx')) {
          parserPlugins.push(['@babel/plugin-syntax-typescript', { isTSX: true }])
        } else if (id.endsWith('.ts')) {
          parserPlugins.push('@babel/plugin-syntax-typescript')
        } else if (id.endsWith('.jsx')) {
          parserPlugins.push('@babel/plugin-syntax-jsx')
        }

        const result = await babel.transformAsync(code, {
          filename: id,
          babelrc: false,
          configFile: false,
          compact: false,
          plugins: [...parserPlugins, 'react-refresh/babel'],
          sourceType: 'unambiguous',
        })

        if (result?.code) {
          // escape the id for use in string literal
          const escapedId = id.replace(/\\/g, '\\\\').replace(/"/g, '\\"')

          // wrap with per-file $RefreshReg$ that includes the file path as unique ID
          // and schedule performReactRefresh() after HMR patch re-execution
          const wrappedCode = `
var __prevRefreshReg = globalThis.$RefreshReg$;
var __prevRefreshSig = globalThis.$RefreshSig$;
if (globalThis.__ReactRefresh) {
  globalThis.$RefreshReg$ = function(type, id) {
    globalThis.__ReactRefresh.register(type, "${escapedId}" + " " + id);
  };
  globalThis.$RefreshSig$ = globalThis.__ReactRefresh.createSignatureFunctionForTransform;
}

${result.code}

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
          return { code: wrappedCode }
        }
      } catch {
        // if babel transform fails, just add the accept boundary
        return {
          code: code + `\nif (import.meta.hot) { import.meta.hot.accept(); }\n`,
        }
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
