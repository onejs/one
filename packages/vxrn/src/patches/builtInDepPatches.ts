import { assertString } from '../utils/assert'
import { type DepPatch, bailIfExists, bailIfUnchanged } from '../utils/patches'

export const builtInDepPatches: DepPatch[] = [
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
    module: '@sentry/react-native',
    patchFiles: {
      version: '>=5.6.0',
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
      version: '>=0.88.0',

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
      @throw addModuleIdentityToException(exception, std::string{moduleName}, methodNameStr);
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
