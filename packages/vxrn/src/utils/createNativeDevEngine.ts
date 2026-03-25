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

  const { dev, viteImportGlobPlugin } = await import('rolldown/experimental')

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
    },

    experimental: {
      // disable devMode temporarily to test rendering without lazy module loading
      // devMode: { implement: hmrRuntimeSource, host, port },
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

      // TODO: add native-compatible react refresh plugin
      // viteReactRefreshWrapperPlugin is web-only (uses HTTP imports)

      ...userPlugins,
    ],
  }

  const outputOptions: OutputOptions = {
    format: 'iife',
    sourcemap: true,
    intro: prelude,
    // register HMRClient after all modules have initialized
    // native side calls HMRClient.setup() right after bundle execution
    outro: `
var __g = typeof globalThis !== 'undefined' ? globalThis : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : this;
if (__g.__fbBatchedBridge) {
  __g.__fbBatchedBridge.registerCallableModule('HMRClient', {
    setup: function() {},
    enable: function() {},
    disable: function() {},
    registerBundle: function() {},
    log: function() {},
  });
}
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

        // inject HMRClient registration right after AppRegistry registration
        code = code.replace(
          /registerCallableModule\s*\(\s*["']AppRegistry["']/,
          (match) =>
            `registerCallableModule("HMRClient",{setup:function(){},enable:function(){},disable:function(){},registerBundle:function(){},log:function(){}}),${match}`
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
 * Transform rolldown's runtime section (Module, DevRuntime, HMR runtime)
 * from ES6 class syntax to ES5 functions using SWC.
 *
 * Hermes doesn't support class syntax. rollipop forks rolldown to emit ES5
 * in the Rust crate. We post-process the ~300 line runtime section with SWC
 * target:'es5' instead, avoiding a fork while working with vanilla rolldown.
 */
/**
 * Transform entire bundle to ES5 for Hermes using SWC.
 * Hermes doesn't support class syntax at all.
 * Wraps in IIFE for function scope, transforms, keeps IIFE in output.
 */
async function transformBundleForHermes(code: string): Promise<string> {
  // wrap in IIFE for hermes (class syntax not supported at top level)
  // don't wrap in IIFE - hermes runtime (not hermesc) supports class at top level
  const wrapped = code
  try {
    const swc = await import('@swc/core')
    const result = await swc.transform(wrapped, {
      filename: 'bundle.js',
      configFile: false,
      swcrc: false,
      sourceMaps: false,
      // CRITICAL: use env.include, NOT target:'es5'
      // target:'es5' converts property access patterns (obj.prop → (0, obj.prop))
      // which breaks rolldown's lazy module exports (__esmMin)
      env: {
        targets: { node: 9999 },
        include: [
          // no transform-classes: hermes V1 supports class syntax natively
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
      isModule: true,
    })
    return result.code
  } catch (err: any) {
    console.warn('[vxrn] SWC bundle transform failed:', err.message)
    return code
  }
}

// kept for reference but no longer used
async function transformRuntimeToES5(code: string): Promise<string> {
  const runtimeMarker = 'globalThis.__rolldown_runtime__'
  const markerIdx = code.indexOf(runtimeMarker)
  if (markerIdx < 0) return code

  // find the start of rolldown's runtime (var Module = class)
  const moduleStart = code.indexOf('var Module = class')
  if (moduleStart < 0) return code

  const endOfMarkerLine = code.indexOf('\n', markerIdx)
  const runtimeEnd = code.indexOf('\n', endOfMarkerLine + 1)

  // extract runtime section, wrap in IIFE for balanced parsing
  const runtimeSection = '(function(){\n' + code.slice(moduleStart, runtimeEnd) + '\n})()'

  try {
    const swc = await import('@swc/core')
    const result = await swc.transform(runtimeSection, {
      filename: 'rolldown-runtime.js',
      configFile: false,
      swcrc: false,
      sourceMaps: false,
      jsc: {
        target: 'es5',
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

    // keep the SWC IIFE wrapper - hermes needs runtime in function scope
    return code.slice(0, moduleStart) + result.code + '\n' + code.slice(runtimeEnd)
  } catch (err: any) {
    console.warn('[vxrn] SWC runtime transform failed:', err.message)
    return code
  }
}

// legacy compat - kept as alias
function moveClassFieldsToConstructor(code: string): string {
  // process all rolldown runtime classes (Module and DevRuntime)
  // apply to Module first, then DevRuntime
  code = processRuntimeClass(code, 'var Module = class {')
  code = processRuntimeClass(code, 'var DevRuntime = class {')
  return code
}

function processRuntimeClass(code: string, classMarker: string): string {
  const devRuntimeStart = code.indexOf(classMarker)
  if (devRuntimeStart < 0) return code

  // find the end of the DevRuntime class by matching braces
  let braceCount = 0
  let devRuntimeEnd = -1
  for (let i = code.indexOf('{', devRuntimeStart); i < code.length; i++) {
    if (code[i] === '{') braceCount++
    else if (code[i] === '}') {
      braceCount--
      if (braceCount === 0) {
        devRuntimeEnd = i + 1
        break
      }
    }
  }
  if (devRuntimeEnd < 0) return code

  let classBody = code.slice(devRuntimeStart, devRuntimeEnd)

  // remove bare field declarations (e.g. `\tclientId;` or `\t\tclientId;`)
  classBody = classBody.replace(/^\t+[a-zA-Z_$]\w*;\s*$/gm, '')

  // convert ALL field initializers to constructor assignments
  // we need to handle both simple and complex (arrow fns, IIFEs)
  // strategy: find lines that start a field assignment at class level (2 tabs)
  // and collect everything until the next method/field/closing brace
  const lines = classBody.split('\n')
  const fieldInits: string[] = []
  const cleanedLines: string[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    // match field initializer start: `name = ...` at 2-tab indent
    // must not be inside a method (check it's not preceded by () {)
    const fieldStart = line.match(/^\t+([a-zA-Z_$]\w*)\s*=\s*/)
    if (fieldStart && !trimmed.startsWith('this.') && !trimmed.startsWith('//') && !trimmed.startsWith('*')) {
      // collect the entire field value (may span multiple lines)
      let fieldCode = line
      // count braces/parens to find the end
      let opens = (fieldCode.match(/[({]/g) || []).length
      let closes = (fieldCode.match(/[)}]/g) || []).length
      while (opens > closes && i + 1 < lines.length) {
        i++
        fieldCode += '\n' + lines[i]
        opens = (fieldCode.match(/[({]/g) || []).length
        closes = (fieldCode.match(/[)}]/g) || []).length
      }
      // extract name and value
      const eqIdx = fieldCode.indexOf('=')
      const name = fieldCode.slice(0, eqIdx).trim().replace(/^\t+/, '')
      let value = fieldCode.slice(eqIdx + 1).trim()
      if (value.endsWith(';')) value = value.slice(0, -1)
      fieldInits.push(`this.${name} = ${value};`)
      i++
      continue
    }

    cleanedLines.push(line)
    i++
  }
  classBody = cleanedLines.join('\n')

  // inject into constructor
  if (fieldInits.length > 0) {
    const ctorPattern = /(constructor\s*\([^)]*\)\s*\{)/
    const m = classBody.match(ctorPattern)
    if (m) {
      const at = classBody.indexOf(m[0]) + m[0].length
      const inits = fieldInits.map((f) => `\n\t\t\t${f}`).join('')
      classBody = classBody.slice(0, at) + inits + classBody.slice(at)
    }
  }

  return code.slice(0, devRuntimeStart) + classBody + code.slice(devRuntimeEnd)
}

/**
 * Generate a real entry file on disk for the native bundle.
 * Uses import.meta.glob for route discovery (can't do this in virtual modules).
 * Imports createApp from One which handles all RN initialization.
 */
function generateNativeEntry(root: string, _userEntry: string): string {
  // write entry at project root so import.meta.glob('./app/...') resolves correctly
  const entryPath = join(root, '.vxrn-entry-native.tsx')
  const entryCode = `
// auto-generated native entry for rolldown dev()
import { AppRegistry } from 'react-native';
import { createApp } from 'one';

createApp({
  routes: import.meta.glob(['./app/**/*.tsx', './app/**/*.ts', '!./app/**/*+api.*', '!./app/**/*.test.*', '!./app/**/*.d.ts'], { exhaustive: true }),
  routerRoot: 'app',
  flags: {},
});

// native bridge calls runApplication automatically through Fabric
// do NOT call runApplication from JS - it would use Legacy Architecture
// which conflicts with the Fabric-built binary
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
