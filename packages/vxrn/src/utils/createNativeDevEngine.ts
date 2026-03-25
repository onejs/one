/**
 * Creates a rolldown DevEngine for native React Native bundle serving.
 * Uses rolldown's experimental dev() API with ESM output.
 *
 * Inspired by rollipop's architecture:
 * https://github.com/leegeunhyeok/rollipop
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, extname, join, relative } from 'node:path'
import type { InputOptions, OutputOptions, Plugin, RolldownOutput } from 'rolldown'
import { getNativePrelude } from '../runtime/native-prelude'

// asset extensions that should be handled as RN assets
const ASSET_EXTS = new Set([
  'bmp',
  'gif',
  'jpg',
  'jpeg',
  'png',
  'psd',
  'svg',
  'webp', // images
  'mp4',
  'mov',
  'mp3',
  'wav',
  'aac',
  'ogg', // media
  'ttf',
  'otf', // fonts
  'html',
  'pdf',
  'zip', // documents
])

// files that contain Flow syntax and need stripping
const FLOW_FILE_PATTERN = /node_modules[\\/](?:react-native|@react-native)[\\/].*\.js$/

interface NativeDevEngineOptions {
  root: string
  port: number
  host?: string
  platform: 'ios' | 'android'
  entry: string
  serverUrl?: string
  plugins?: Plugin[]
  onHmrUpdate?: (update: { type: string; code?: string }) => void
}

interface NativeDevEngineResult {
  engine: any
  getBundle: () => Promise<{ code: string; map?: string }>
  close: () => Promise<void>
}

export async function createNativeDevEngine(
  options: NativeDevEngineOptions
): Promise<NativeDevEngineResult> {
  const {
    root,
    port,
    host = 'localhost',
    platform,
    entry,
    serverUrl,
    plugins: userPlugins = [],
    onHmrUpdate,
  } = options

  const { dev, viteImportGlobPlugin, viteReactRefreshWrapperPlugin } = await import(
    'rolldown/experimental'
  )

  const hmrRuntimeSource = getHmrRuntimeSource()

  const prelude = getNativePrelude({
    dev: true,
    platform,
    serverUrl: serverUrl || `http://${host}:${port}`,
  })

  // generate a real entry file on disk (virtual modules can't use import.meta.glob)
  const entryFile = generateNativeEntry(root, entry)

  let currentBundle: { code: string; map?: string } | null = null
  let bundleResolve: ((value: any) => void) | null = null
  let bundlePromise: Promise<any> | null = null

  // platform-specific extensions
  const platformExts =
    platform === 'ios'
      ? ['.ios.tsx', '.ios.ts', '.ios.jsx', '.ios.js']
      : ['.android.tsx', '.android.ts', '.android.jsx', '.android.js']
  const nativeExts = ['.native.tsx', '.native.ts', '.native.jsx', '.native.js']
  const defaultExts = ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.cjs', '.json']

  const inputOptions: InputOptions = {
    input: entryFile,
    cwd: root,
    platform: 'neutral',

    resolve: {
      extensions: [...platformExts, ...nativeExts, ...defaultExts],
      conditionNames: ['react-native', 'import', 'require', 'default'],
      mainFields: ['react-native', 'module', 'main'],
    },

    transform: {
      jsx: {
        // use 'classic' mode like the old pipeline (babel plugin-transform-react-jsx)
        // 'automatic' has 24 files where jsxDEV import fails to resolve
        runtime: 'classic',
      },
      define: {
        'process.env.NODE_ENV': '"development"',
        __DEV__: 'true',
      },
      // auto-inject React import for classic JSX (React.createElement)
      inject: {
        React: 'react',
      },
    },

    experimental: {
      devMode: { implement: hmrRuntimeSource, host, port },
      incrementalBuild: true,
    },

    treeshake: false,

    moduleTypes: {
      '.js': 'jsx',
    },

    plugins: [
      // handle import.meta.glob (used by One's route system)
      viteImportGlobPlugin({ root }) as any,

      // strip Flow types from react-native and @react-native packages
      flowStripPlugin(),

      // handle asset imports (.png, .jpg, .ttf, etc.)
      assetPlugin({ root, platform }),

      // hermes compat: transform class properties and private fields
      hermesCompatSWCPlugin(),

      // react-native codegen for native component specs
      codegenPlugin(),

      // devMode already adds createModuleHotContext for all modules
      // no additional React Refresh wrapper needed

      ...userPlugins,
    ],
  }

  const outputOptions: OutputOptions = {
    format: 'esm',
    sourcemap: true,
    intro: prelude,
    // register HMRClient after all modules have initialized
    // native side calls HMRClient.setup() right after bundle execution
    // outro: connect HMR WebSocket using RN's WebSocket module (not the global)
    outro: `
try {
  // access RN's WebSocket class via the lazy module init (not the broken global)
  var __WS = (init_WebSocket(), __toCommonJS(WebSocket_exports)).default;
  var __hmrUrl = 'ws://${host === '0.0.0.0' ? 'localhost' : host}:${port}/hot';
  var __hmrWS = new __WS(__hmrUrl);
  __hmrWS.onmessage = function(event) {
    try {
      console.warn('[vxrn HMR] received message: ' + (typeof event.data === 'string' ? event.data.slice(0, 100) : typeof event.data));
      var msg = JSON.parse(event.data);
      if (msg.type === 'hmr:update' && msg.code) {
        console.warn('[vxrn HMR] evaluating patch (' + msg.code.length + ' chars)');
        var g = typeof global !== 'undefined' ? global : globalThis;
        if (g.globalEvalWithSourceUrl) g.globalEvalWithSourceUrl(msg.code);
        else (0, eval)(msg.code);
      } else if (msg.type === 'hmr:reload') {
        var g = typeof global !== 'undefined' ? global : globalThis;
        var ds = g.__turboModuleProxy ? g.__turboModuleProxy('DevSettings') : null;
        if (ds && ds.reload) ds.reload();
      }
    } catch(e) { console.error('[vxrn HMR] eval error:', e); }
  };
  __hmrWS.onopen = function() {
    console.warn('[vxrn HMR] connected, flushing ' + (__rolldown_runtime__ && __rolldown_runtime__._shared ? __rolldown_runtime__._shared._queue.length : 0) + ' queued messages');
    // connect the rolldown runtime's messenger to this WebSocket
    if (typeof __rolldown_runtime__ !== 'undefined' && __rolldown_runtime__.setup) {
      __rolldown_runtime__.setup(__hmrWS, __hmrUrl.replace('ws://', 'http://'));
    }
  };
  __hmrWS.onerror = function(e) { console.warn('[vxrn HMR] ws error:', e.message || e); };
} catch(e) { console.warn('[vxrn HMR] setup failed:', e.message); }
`,
    codeSplitting: false,
    strictExecutionOrder: true,
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
        let code = chunk.code
        // strip ESM export statements (hermes doesn't support ESM)
        code = code.replace(/^\s*export\s*\{[^}]*\}\s*;?\s*$/gm, '')
        // with hermes V1, no whole-bundle SWC transform needed
        // hermes V1 supports: classes, let/const, async/await, maps, sets
        // only class-properties/private-fields handled per-file by hermesCompatSWCPlugin

        // inject our HMR client BEFORE RN's own HMRClient registration
        // (RN's lazy HMRClient at line ~29563 would override our outro otherwise)
        const hmrClientCode = `registerCallableModule("HMRClient",{setup:function(p,b,h,port,e,s){setTimeout(function(){try{var WS=typeof WebSocket!=="undefined"?WebSocket:typeof globalThis!=="undefined"&&globalThis.WebSocket?globalThis.WebSocket:typeof global!=="undefined"&&global.WebSocket?global.WebSocket:typeof window!=="undefined"&&window.WebSocket?window.WebSocket:null;if(!WS){console.warn("[vxrn HMR] WebSocket not available on any global");return}var ws=new WS((s||"http")+"://"+h+(port?":"+port:"")+"/hot");ws.onmessage=function(ev){try{var m=JSON.parse(ev.data);if(m.type==="hmr:update"&&m.code){if(g.globalEvalWithSourceUrl)g.globalEvalWithSourceUrl(m.code);else(0,eval)(m.code)}else if(m.type==="hmr:reload"){(g.__turboModuleProxy?g.__turboModuleProxy("DevSettings"):g.nativeModuleProxy.DevSettings).reload()}}catch(e){console.error("[vxrn HMR]",e)}};console.warn("[vxrn HMR] connected to "+h+":"+port)}catch(e){console.warn("[vxrn HMR] failed:",e)}},0)},enable:function(){},disable:function(){},registerBundle:function(){},log:function(){}})`
        code = code.replace(
          /registerCallableModule\s*\(\s*["']AppRegistry["']/,
          (match) => hmrClientCode + ',' + match
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
      const changedFiles = (result as any).changedFiles || []
      console.info(`[vxrn] HMR: ${updates.length} updates, ${changedFiles.length} changed files`)

      for (const item of updates) {
        const update = item.update || item
        console.info(`[vxrn] HMR update: type=${update.type}, code=${update.code?.length || 0}`)
        if (update.type === 'Patch' && update.code) {
          onHmrUpdate?.({ type: 'hmr:update', code: update.code })
        } else if (update.type === 'FullReload') {
          onHmrUpdate?.({ type: 'hmr:reload' })
        }
      }

      // if no real patches, send full reload as fallback
      if (updates.length === 0 || (updates.length === 1 && (updates[0]?.update?.code?.length || 0) < 100)) {
        console.info('[vxrn] HMR: no patch content, sending reload')
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
        bundlePromise = new Promise((resolve) => {
          bundleResolve = resolve
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

function generateNativeEntry(root: string, _userEntry: string): string {
  // write entry at project root so import.meta.glob('./app/...') resolves correctly
  const entryPath = join(root, '.vxrn-entry-native.tsx')
  const entryCode = `
// auto-generated native entry for rolldown dev()
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
  const assetRegex = new RegExp(`\\.(?:${[...ASSET_EXTS].join('|')})$`)

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
function hermesCompatSWCPlugin(): Plugin {
  let swc: typeof import('@swc/core') | null = null

  return {
    name: 'vxrn:hermes-compat',
    async transform(code, id) {
      if (!/\.[cm]?[jt]sx?$/.test(id)) return
      if (id.includes('\0') || id.includes('virtual:')) return
      // only transform files with class syntax (skip files without it for perf)
      if (!code.includes('class ') && !code.includes('class{')) return
      // skip very large prebuilt files
      if (code.length > 500_000) return

      try {
        if (!swc) swc = await import('@swc/core')
        const result = await swc.transform(code, {
          filename: id,
          configFile: false,
          swcrc: false,
          sourceMaps: false,
          inputSourceMap: false,
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
 * Simple React Refresh wrapper for native HMR.
 * Appends import.meta.hot.accept() to component files so rolldown
 * generates proper HMR boundaries.
 */
function nativeReactRefreshPlugin(): Plugin {
  return {
    name: 'vxrn:react-refresh',
    transform(code, id) {
      // only wrap user files (not node_modules)
      if (id.includes('node_modules')) return
      if (!/\.[tj]sx?$/.test(id)) return
      // skip non-component files (must have JSX or function components)
      if (!code.includes('createElement') && !code.includes('jsx') && !code.includes('function ')) return

      // append HMR acceptance
      const hotCode = `
if (import.meta.hot) {
  import.meta.hot.accept();
}
`
      return { code: code + hotCode }
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
    var self = this;
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

    var runtime = this;
    socket.addEventListener('message', function(event) {
      var msg = JSON.parse(event.data);
      if (msg.type === 'hmr:update') {
        if (globalThis.globalEvalWithSourceUrl) {
          globalThis.globalEvalWithSourceUrl(msg.code);
        } else {
          (0, eval)(msg.code);
        }
      } else if (msg.type === 'hmr:reload') {
        var moduleName = 'DevSettings';
        (globalThis.__turboModuleProxy
          ? globalThis.__turboModuleProxy(moduleName)
          : globalThis.nativeModuleProxy[moduleName]
        ).reload();
      }
    });
  }
}

globalThis.__rolldown_runtime__ = new ReactNativeDevRuntime();
`
}
