import { assertString } from '../utils/assert'
import { type DepPatch, bailIfExists, bailIfUnchanged } from '../utils/patches'

export const builtInDepPatches: DepPatch[] = [
  // @react-navigation/core 7.17 renamed createComponentForStaticNavigation to
  // createComponentForStaticConfigDeprecated, breaking @react-navigation/native
  // which still imports the old name. re-export the old name as an alias.
  {
    module: '@react-navigation/core',
    patchFiles: {
      version: '>=7.17.0 <8.0.0',
      'lib/module/index.js': (contents) => {
        assertString(contents)
        // only patch if the old export is missing and the new one exists
        if (contents.includes('createComponentForStaticNavigation')) return
        if (!contents.includes('createComponentForStaticConfigDeprecated')) return
        return contents.replace(
          /export \{ createComponentForStaticConfigDeprecated as createComponentForStaticConfig,/,
          'export { createComponentForStaticConfigDeprecated as createComponentForStaticConfig, createComponentForStaticConfigDeprecated as createComponentForStaticNavigation,'
        )
      },

      'lib/commonjs/index.js': (contents) => {
        if (!contents) return
        if (contents.includes('createComponentForStaticNavigation')) return
        if (!contents.includes('createComponentForStaticConfigDeprecated')) return
        return contents.replace(
          /createComponentForStaticConfigDeprecated as createComponentForStaticConfig,/,
          'createComponentForStaticConfigDeprecated as createComponentForStaticConfig, createComponentForStaticConfigDeprecated as createComponentForStaticNavigation,'
        )
      },
    },
  },

  // react-native-maps ships TypeScript source, and every map child component
  // declares the members decorateMapComponent installs on the prototype as
  // definite-assignment class fields (`getNativeComponent!: () => ...`). oxc
  // keeps a field declaration that has no initializer, so constructing the
  // component gives each instance its own `undefined` property that shadows the
  // prototype method, and the first render throws "this.getNativeComponent is
  // not a function". babel's loose class properties erase these on native, so
  // only the vite side breaks. oxc ignores useDefineForClassFields, so no
  // tsconfig or oxc option reaches this; `declare` is what the declaration
  // always meant and every transform erases it.
  {
    module: 'react-native-maps',
    patchFiles: {
      'src/*.tsx': (contents) => {
        assertString(contents)
        const patched = contents.replace(
          /^(\s*)(context|getNativeComponent|getMapManagerCommand|getUIManagerCommand)!:/gm,
          '$1declare $2:'
        )
        bailIfUnchanged(patched, contents)
        return patched
      },
    },
  },

  // react-native-web doesn't export unstable_batchedUpdates but react-native does,
  // so libraries like @legendapp/list break when aliased to rnw on web
  {
    module: 'react-native-web',
    patchFiles: {
      'dist/index.js': (contents) => {
        assertString(contents)
        bailIfExists(contents, 'unstable_batchedUpdates')
        return `${contents}\nexport { unstable_batchedUpdates } from 'react-dom';\n`
      },
    },
  },

  {
    module: 'react',
    patchFiles: {
      version: '18.*',

      'compiler-runtime.js': `module.exports = require('@vxrn/vendor/react-19-compiler-runtime');`,
      'index.vxrn-web.js': `module.exports = require('@vxrn/vendor/react-19');`,
      'jsx-dev-runtime.vxrn-web.js': `module.exports = require('@vxrn/vendor/react-jsx-dev-19');`,
      'jsx-runtime.vxrn-web.js': `module.exports = require('@vxrn/vendor/react-jsx-19');`,

      'package.json': (contents) => {
        assertString(contents)

        const pkg = JSON.parse(contents)

        if (pkg.version.startsWith('19.')) {
          // already on 19 no need to patch!
          return
        }

        const existingExports = { ...pkg.exports }

        if (!pkg.exports['.']) {
          throw new Error(
            `Expected a version of React that has package.json exports defined`
          )
        }

        pkg.exports['.'] = {
          'react-server': './react.shared-subset.js',
          'vxrn-web': './index.vxrn-web.js',
          default: './index.js',
        }

        pkg.exports['./jsx-runtime'] = {
          'vxrn-web': './jsx-runtime.vxrn-web.js',
          default: './jsx-runtime.js',
        }

        pkg.exports['./compiler-runtime'] = {
          default: './compiler-runtime.js',
        }

        pkg.exports['./jsx-dev-runtime'] = {
          'vxrn-web': './jsx-dev-runtime.vxrn-web.js',
          default: './jsx-dev-runtime.js',
        }

        bailIfUnchanged(existingExports, pkg.exports)

        return JSON.stringify(pkg, null, 2)
      },

      // for prod builds we have to actually change the entries:

      // to avoid terrible metro we have to eval :(
      'index.js': (contents) => {
        assertString(contents)
        return `
if (process.env.VXRN_REACT_19) { Object.assign(exports, eval("require('@vxrn/vendor/react-19')")) } else {
  ${contents}
}`
      },

      // to avoid terrible metro we have to eval :(
      'jsx-runtime.js': (contents) => {
        assertString(contents)
        return `
if (process.env.VXRN_REACT_19) { Object.assign(exports, eval("require('@vxrn/vendor/react-jsx-19')")) } else {
  ${contents}
}`
      },
    },
  },

  {
    module: 'react-dom',
    patchFiles: {
      version: '18.*',

      // for prod builds we have to actually change the entries:
      'index.js': (contents) => {
        assertString(contents)
        return `
if (process.env.VXRN_REACT_19) { Object.assign(exports, eval("require('@vxrn/vendor/react-dom-19')")) } else {
${contents}
}`
      },

      'client.js': (contents) => {
        assertString(contents)
        return `
if (process.env.VXRN_REACT_19) { Object.assign(exports, eval("require('@vxrn/vendor/react-dom-client-19')")) } else {
${contents}
}`
      },

      'server.browser.js': (contents) => {
        assertString(contents)
        return `
if (process.env.VXRN_REACT_19) { Object.assign(exports, require('@vxrn/vendor/react-dom-server.browser-19')) } else {
${contents}
}`
      },

      'client.vxrn-web.js': `module.exports = require('@vxrn/vendor/react-dom-client-19')`,

      'index.vxrn-web.js': `module.exports = require('@vxrn/vendor/react-dom-19')`,

      'server.browser.vxrn-web.js': `module.exports = require('@vxrn/vendor/react-dom-server.browser-19')`,

      'test-utils.vxrn-web.js': `module.exports = require('@vxrn/vendor/react-dom-test-utils-19')`,

      'package.json': (contents) => {
        assertString(contents)

        const pkg = JSON.parse(contents)

        if (pkg.version.startsWith('19.')) {
          // already on 19 no need to patch!
          return
        }

        const existingExports = { ...pkg.exports }

        if (!pkg.exports['.']) {
          throw new Error(
            `Expected a version of React that has package.json exports defined`
          )
        }

        pkg.exports['.'] = {
          'vxrn-web': './index.vxrn-web.js',
          default: './index.js',
        }

        pkg.exports['./client'] = {
          'vxrn-web': './client.vxrn-web.js',
          default: './client.js',
        }

        pkg.exports['./server.browser'] = {
          'vxrn-web': './server.browser.vxrn-web.js',
          default: './server.browser.js',
        }

        pkg.exports['./test-utils'] = {
          'vxrn-web': './test-utils.vxrn-web.js',
          default: './test-utils.js',
        }

        bailIfUnchanged(existingExports, pkg.exports)

        return JSON.stringify(pkg, null, 2)
      },
    },
  },

  // Older versions of the cli-config package will not look for `.cjs` files when loading the config. This isn't necessary for v14.x (which comes with RN 0.75). See: https://hackmd.io/@z/SJghMPN6C.
  {
    module: '@react-native-community/cli-config',
    patchFiles: {
      version: '>=13.0.0 <16.0.0',
      'build/readConfigFromDisk.js': (contents) => {
        assertString(contents)

        return contents
          .replace(
            `['react-native.config.js']`,
            `['react-native.config.js', 'react-native.config.cjs']`
          )
          .replace(
            'searchPlaces,',
            `searchPlaces, loaders: { '.cjs': _cosmiconfig().default.loadJs },`
          )
          .replace(
            'stopDir: rootFolder,',
            `stopDir: rootFolder, loaders: { '.cjs': _cosmiconfig().default.loadJs },`
          )
      },
    },
  },

  {
    module: 'react-native-reanimated',
    patchFiles: {
      // reanimated 4 ships no JSX in its `.js`. Measured against 4.5.1: all 374
      // files parse with SWC at `jsx: false`, and the only JSX-shaped text is
      // inside comments. The transform still rewrote and reformatted every one
      // of them, which is how a patch aimed at reanimated ended up re-printing
      // its nested `semver` and giving one package@version two contents on
      // disk. Left in place below 4 rather than deleted, because we verified 4
      // and not the 3.x line.
      version: '<4.0.0',
      '**/*.js': ['jsx'],
    },
  },

  // fix RNGH crash on RN 0.86+ new architecture
  // getShadowNodeFromRef crashes when findHostInstance_DEPRECATED returns null
  {
    module: 'react-native-gesture-handler',
    patchFiles: {
      version: '>=3.0.0',

      'lib/module/getShadowNodeFromRef.js': (contents) => {
        return contents?.replace(
          `const hostInstance = isAlreadyHostInstance ? ref : findHostInstance_DEPRECATED(ref);

  // @ts-ignore Fabric
  return getInternalInstanceHandleFromPublicInstance(hostInstance).stateNode.node;`,
          `const hostInstance = isAlreadyHostInstance ? ref : findHostInstance_DEPRECATED(ref);
  if (hostInstance === null || hostInstance === undefined) {
    return null;
  }
  const internalHandle = getInternalInstanceHandleFromPublicInstance(hostInstance);
  if (internalHandle === null || internalHandle === undefined) {
    return null;
  }
  return internalHandle.stateNode?.node ?? null;`
        )
      },

      // metro uses src/ directly via "react-native" field in package.json
      'src/getShadowNodeFromRef.ts': (contents) => {
        return contents?.replace(
          `const hostInstance = isAlreadyHostInstance
    ? ref
    : findHostInstance_DEPRECATED(ref);

  // @ts-ignore Fabric
  return getInternalInstanceHandleFromPublicInstance(hostInstance).stateNode
    .node;`,
          `const hostInstance = isAlreadyHostInstance
    ? ref
    : findHostInstance_DEPRECATED(ref);
  if (hostInstance === null || hostInstance === undefined) {
    return null;
  }
  const internalHandle = getInternalInstanceHandleFromPublicInstance(hostInstance);
  if (internalHandle === null || internalHandle === undefined) {
    return null;
  }
  return internalHandle.stateNode?.node ?? null;`
        )
      },
    },
  },

  {
    module: '@react-native-masked-view/masked-view',
    patchFiles: {
      '**/*.js': ['flow', 'swc'],
    },
  },

  {
    module: 'react-native-vector-icons',
    patchFiles: {
      '**/*.js': ['jsx', 'flow'],
    },
  },

  {
    module: 'react-native-webview',
    patchFiles: {
      '**/*.js': ['jsx'],
    },
  },

  {
    module: '@react-native/assets-registry',
    patchFiles: {
      '**/*.js': ['flow'],
    },
  },

  {
    module: 'expo',
    patchFiles: {
      'build/**/*.js': ['jsx'],
    },
  },

  {
    module: 'expo',
    patchFiles: {
      version: '>=52.0.0 <56.0.0',
      'src/winter/runtime.native.ts': (contents) => {
        assertString(contents)

        return contents.replace(
          `
// https://encoding.spec.whatwg.org/#textdecoder
install('TextDecoder', () => require('./TextDecoder').TextDecoder);
// https://url.spec.whatwg.org/#url
install('URL', () => require('./url').URL);
// https://url.spec.whatwg.org/#urlsearchparams
install('URLSearchParams', () => require('./url').URLSearchParams);
            `.trim(),
          `
import { TextDecoder } from './TextDecoder';
import { URL } from './url';
import { URLSearchParams } from './url';

// https://encoding.spec.whatwg.org/#textdecoder
install('TextDecoder', () => TextDecoder);
// https://url.spec.whatwg.org/#url
install('URL', () => URL);
// https://url.spec.whatwg.org/#urlsearchparams
install('URLSearchParams', () => URLSearchParams);
            `.trim()
        )
      },
    },
  },

  {
    module: 'expo-modules-core',
    patchFiles: {
      version: '<=55.*',
      'src/**/*.ts': addNoCheck,
      'src/**/*.tsx': addNoCheck,
    },
  },

  {
    module: '@expo/cli',
    patchFiles: {
      version: '<=55',

      'build/src/export/embed/exportEmbedAsync.js': (contents) => {
        return contents?.replace(
          'exportEmbedAsync(projectRoot, options) {',
          'exportEmbedAsync(projectRoot, options) { console.warn("[one] skipping expo export:embed since it will not work properly, we just let the JS bundle build during the native build process where VxRN has control"); return;'
        )
      },
    },
  },

  {
    module: 'expo-liquid-glass-view',
    patchFiles: {
      'build/**/*.js': ['jsx'],
    },
  },

  {
    module: 'expo-ios-popover-tip',
    patchFiles: {
      'build/**/*.js': ['jsx'],
    },
  },

  {
    module: 'expo-ios-text-animations',
    patchFiles: {
      'build/**/*.js': ['jsx'],
    },
  },

  {
    module: 'expo-ios-mesh-gradient',
    patchFiles: {
      'build/**/*.js': ['jsx'],
    },
  },

  {
    module: 'expo-glass-effect',
    patchFiles: {
      'build/**/*.js': ['jsx'],
    },
  },

  {
    module: '@expo/ui',
    patchFiles: {
      'build/**/*.js': ['jsx'],
    },
  },

  {
    module: 'expo-image',
    patchFiles: {
      'build/**/*.js': ['jsx'],
    },
  },

  {
    module: 'expo-linear-gradient',
    patchFiles: {
      'build/**/*.js': ['jsx'],
    },
  },

  {
    module: 'expo-apple-authentication',
    patchFiles: {
      'build/**/*.js': ['jsx'],
    },
  },

  {
    module: 'react-native-css-interop',
    patchFiles: {
      // 2 of 53 dist files genuinely need JSX parsing, so this one is real.
      //
      // Two sibling patches were removed here, both dead. A `wrap-jsx.js` entry
      // tried to hoist `require("./components")` out of the function so
      // cssInterop registration runs, but `patches.ts` selects with
      // `filePatches.find(relativePath)` and `dist/**/*.js` is declared first,
      // so the glob shadowed it and the hoist never executed once: the patched
      // file on disk still has the require inside the function. A `package.json`
      // entry set `sideEffects` to keep components.js from being tree-shaken,
      // and 0.2.6 already ships exactly that value.
      //
      // So nativewind registration has never actually been hoisted by this
      // patch. Anyone deciding whether to keep the CSS-on-native path should
      // start from that, not from the assumption that it works today.
      'dist/**/*.js': ['jsx'],
    },
  },

  {
    module: 'expo-video',
    patchFiles: {
      'build/**/*.js': ['jsx'],
    },
  },

  {
    module: 'expo-clipboard',
    patchFiles: {
      'build/**/*.js': ['jsx'],
    },
  },

  {
    module: '@expo/vector-icons',
    patchFiles: {
      'build/**/*.js': ['jsx'],
    },
  },

  {
    module: '@sentry/react-native',
    patchFiles: {
      version: '>=5.6.0',
      'dist/**/*.js': ['jsx'],
    },
  },

  {
    module: '@sentry/react-native',
    patchFiles: {
      version: '>=5.0.0 <5.6.0',

      'dist/js/utils/environment.js': (contents) => {
        assertString(contents)
        return contents.replace(
          `import { version as RNV } from 'react-native/Libraries/Core/ReactNativeVersion';`,
          `import { Platform } from 'react-native';\nconst RNV = Platform.constants.reactNativeVersion;\n`
        )
      },

      'dist/**/*.js': ['jsx'],
    },
  },

  {
    module: 'qrcode',
    patchFiles: {
      version: '<=1.5.1',

      'lib/server.js': (contents) => {
        assertString(contents)
        return contents.replace(
          `const TerminalRenderer = require('./renderer/terminal')`,
          `const TerminalRenderer = require('./renderer/terminal.js')`
        )
      },
    },
  },

  {
    module: 'expo-camera',
    patchFiles: {
      '**/*.js': ['jsx'],
    },
  },

  {
    module: 'expo-blur',
    patchFiles: {
      '**/*.js': ['jsx'],
    },
  },

  {
    module: 'expo-asset',
    patchFiles: {
      // Fix: expo-asset re-exports from react-native but RN uses properties on default export, not named exports
      // This patch explicitly re-exports the functions so they're available as named exports
      'build/resolveAssetSource.native.js': (contents) => {
        assertString(contents)
        return contents.replace(
          `export * from 'react-native/Libraries/Image/resolveAssetSource';`,
          `export const pickScale = resolveAssetSource.pickScale;
export const setCustomSourceTransformer = resolveAssetSource.setCustomSourceTransformer;
export const addCustomSourceTransformer = resolveAssetSource.addCustomSourceTransformer;`
        )
      },
    },
  },

  {
    module: 'whatwg-url-without-unicode',
    // https://github.com/onejs/one/issues/258
    patchFiles: {
      '**/*.js': (contents) =>
        contents
          ?.replace(
            /punycode\.ucs2\.decode/gm,
            '(punycode.ucs2decode || punycode.ucs2.decode)'
          )
          ?.replace(
            /punycode\.ucs2\.encode/gm,
            '(punycode.ucs2encode || punycode.ucs2.encode)'
          ),
    },
  },

  {
    module: '@hot-updater/plugin-core',
    patchFiles: {
      version: '0.*',
      'dist/index.cjs': (contents) => {
        // patch require('mime') to use dynamic import workaround
        return contents?.replace(
          'let mime = require("mime");',
          'let mime = { getType: () => "application/octet-stream", getExtension: () => null };'
        )
      },
    },
  },

  // a void TurboModule method that throws an Obj-C NSException crashes the app
  // when React Native rethrows it on the TurboModule queue. there is no JS
  // caller for an async void method to receive an error, so log it instead.
  // see tests/test/IOS_PROD_CRASH.md
  {
    module: 'react-native',
    patchFiles: {
      version: '>=0.86.0',

      'ReactCommon/react/nativemodule/core/platform/ios/ReactCommon/RCTTurboModule.mm': (
        contents
      ) => {
        if (!contents) return
        return contents.replace(
          `    @try {
      [inv invokeWithTarget:strongModule];
    } @catch (NSException *exception) {
      // Void methods are always async, re-throw instead of converting to
      // JSError, same as the async branch in performMethodInvocation.
      @throw exception;
    } @finally {`,
          `    @try {
      [inv invokeWithTarget:strongModule];
    } @catch (NSException *exception) {
      RCTLogError(@"Exception in %s.%s: %@", moduleName, methodNameStr.c_str(), exception.reason);
    } @finally {`
        )
      },
    },
  },
]

function addNoCheck(contents?: string) {
  if (!contents?.includes('// @ts-nocheck')) {
    return `// @ts-nocheck\n${contents}`
  }
}
