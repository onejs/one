/**
 * Creates a rolldown DevEngine for native React Native bundle serving.
 * Uses rolldown's experimental dev() API with ESM output.
 *
 * Inspired by rollipop's architecture:
 * https://github.com/leegeunhyeok/rollipop
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
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
  } = options

  const { dev } = await import('rolldown/experimental')

  // compile HMR runtime to ES5 like rollipop does
  // (rolldown injects this string raw, so class fields must be pre-compiled)
  const hmrRuntimeSource = await compileHmrRuntime(getHmrRuntimeSource())

  const prelude = getNativePrelude({
    dev: true,
    platform,
    serverUrl: serverUrl || `http://${host}:${port}`,
  })

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
    input: entry,
    cwd: root,
    platform: 'neutral',

    resolve: {
      extensions: [...platformExts, ...nativeExts, ...defaultExts],
      conditionNames: ['react-native', 'import', 'require', 'default'],
      mainFields: ['react-native', 'module', 'main'],
    },

    transform: {
      jsx: {
        runtime: 'automatic',
        development: true,
      },
    },

    experimental: {
      devMode: {
        implement: hmrRuntimeSource,
        host,
        port,
      },
      incrementalBuild: true,
    },

    treeshake: false,

    moduleTypes: {
      '.js': 'jsx',
    },

    plugins: [
      // strip Flow types from react-native and @react-native packages
      flowStripPlugin(),

      // handle asset imports (.png, .jpg, .ttf, etc.)
      assetPlugin({ root, platform }),

      // hermes compat: transform class properties and private fields
      hermesCompatSWCPlugin(),

      // TODO: add native-compatible react refresh plugin
      // viteReactRefreshWrapperPlugin is web-only (uses HTTP imports)

      ...userPlugins,
    ],
  }

  const outputOptions: OutputOptions = {
    format: 'iife',
    sourcemap: true,
    intro: prelude,
    // critical for devMode to wrap all modules including entry
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
        // rolldown's internal DevRuntime has class field declarations (e.g. `modules = {}`)
        // that hermes can't parse. rollipop solves this with a custom rolldown fork.
        // we move field initializers into constructors via string replacement.
        let code = chunk.code
        code = moveClassFieldsToConstructor(code)

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

    onHmrUpdates: (result) => {
      if (result instanceof Error) {
        console.error('[vxrn] HMR error:', result.message)
      }
    },

    rebuildStrategy: 'auto',
    watch: { skipWrite: true },
  })

  await engine.run()

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

// --- utils ---

/**
 * Move class field declarations/initializers into constructors.
 * Hermes doesn't support `class { field = value; }` syntax.
 * Instead of running a full SWC/babel transform (which converts classes to
 * functions and breaks ordering), we do targeted string replacements.
 *
 * Matches patterns like:
 *   class Foo {
 *     field;           → removed, added to constructor as this.field = undefined
 *     field = value;   → removed, added to constructor as this.field = value
 *   }
 */
function moveClassFieldsToConstructor(code: string): string {
  // regex to find class bodies and extract field declarations
  // this is a simplified approach that works for rolldown's output format
  return code.replace(
    /class\s+(\w*)\s*(?:extends\s+[^{]+)?\{([\s\S]*?)\n\t*\}/g,
    (classMatch, className, classBody) => {
      const lines = classBody.split('\n')
      const fieldInits: string[] = []
      const cleanedLines: string[] = []

      for (const line of lines) {
        const trimmed = line.trim()
        // match bare field declarations: `fieldName;`
        if (/^[a-zA-Z_$]\w*\s*;$/.test(trimmed) && !trimmed.includes('(')) {
          // bare field - skip it (undefined by default)
          continue
        }
        // match field initializers: `fieldName = expression;`
        const fieldMatch = trimmed.match(/^([a-zA-Z_$]\w*)\s*=\s*(.+);$/)
        if (
          fieldMatch &&
          !trimmed.includes('(') &&
          !trimmed.startsWith('//') &&
          !trimmed.startsWith('*')
        ) {
          const [, fieldName, initializer] = fieldMatch
          // skip if it looks like a method or has complex nesting
          if (!initializer.includes('=>') || initializer.includes('{')) {
            fieldInits.push(`this.${fieldName} = ${initializer};`)
            continue
          }
        }
        cleanedLines.push(line)
      }

      if (fieldInits.length === 0) return classMatch

      // inject field inits at the start of the constructor
      let result = cleanedLines.join('\n')
      const constructorMatch = result.match(/(constructor\s*\([^)]*\)\s*\{)/)
      if (constructorMatch) {
        const idx = result.indexOf(constructorMatch[0])
        const insertPoint = idx + constructorMatch[0].length
        const indent = '\n\t\t\t'
        result =
          result.slice(0, insertPoint) +
          indent +
          fieldInits.join(indent) +
          result.slice(insertPoint)
      }

      // rebuild the class
      const classPrefix = classMatch.slice(0, classMatch.indexOf('{') + 1)
      const classSuffix = classMatch.slice(classMatch.lastIndexOf('}'))
      return classPrefix + result + '\n' + classSuffix
    }
  )
}

/**
 * Pre-compile HMR runtime to ES5 using SWC.
 * Same approach as rollipop's tsdown build step:
 * https://github.com/leegeunhyeok/rollipop/blob/main/packages/rollipop/tsdown.config.ts
 *
 * rolldown injects the `devMode.implement` string raw into the bundle,
 * so class field declarations must be pre-compiled before injection.
 */
async function compileHmrRuntime(source: string): Promise<string> {
  const swc = await import('@swc/core')
  const result = await swc.transform(source, {
    filename: 'hmr-runtime.js',
    configFile: false,
    swcrc: false,
    sourceMaps: false,
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
      keepClassNames: true,
      externalHelpers: false,
      assumptions: {
        setPublicClassFields: true,
        privateFieldsAsProperties: true,
      },
    },
    isModule: false,
  })
  return result.code
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
          return { code: result.code, map: result.map, moduleType: 'jsx' as any }
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

// --- HMR runtime ---

function getHmrRuntimeSource(): string {
  return `
// vxrn HMR runtime for rolldown devMode
var BaseDevRuntime = DevRuntime;

class ReactNativeDevRuntime extends BaseDevRuntime {
  constructor() {
    var clientId = 'rn-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    super({ send: function(msg) {
      var s = JSON.stringify(msg);
      if (this._socket && this._socket.readyState === 1) { this._socket.send(s); }
      else { this._queue.push(s); }
    }.bind({ _socket: null, _queue: [] })}, clientId);
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

    if (socket.readyState === 1) {
      for (var i = 0; i < this._queue.length; i++) socket.send(this._queue[i]);
      this._queue = [];
    } else {
      var self = this;
      socket.addEventListener('open', function() {
        for (var i = 0; i < self._queue.length; i++) socket.send(self._queue[i]);
        self._queue = [];
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
