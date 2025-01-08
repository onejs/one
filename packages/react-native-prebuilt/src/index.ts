import { readFile } from 'node:fs/promises'
import { mustReplace } from '@vxrn/utils'
import { transformFlow } from '@vxrn/vite-flow'
import { build, type BuildOptions } from 'esbuild'
import FSExtra from 'fs-extra'

import { createRequire } from 'node:module'

const requireResolve =
  'url' in import.meta ? createRequire(import.meta.url).resolve : require.resolve

const external = ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime']

export async function buildReactJSX(options: BuildOptions = {}) {
  const isProd = options.define?.['__DEV__'] === 'false'

  return build({
    bundle: true,
    entryPoints: [requireResolve('react/jsx-dev-runtime')],
    format: 'cjs',
    target: 'node16',
    jsx: 'transform',
    jsxFactory: 'react',
    allowOverwrite: true,
    platform: 'node',
    define: {
      __DEV__: 'true',
      'process.env.NODE_ENV': `"development"`,
    },
    external,
    logLevel: 'warning',
    ...options,
  }).then(async () => {
    // manual force exports
    const bundled = await readFile(options.outfile!, 'utf-8')

    const outCode = `
    const run = () => {
      ${mustReplace(bundled, [
        ...(isProd
          ? [
              {
                // react 18 and 19 (18 has _min)
                find: /module\.exports = require_react_jsx_runtime_production([a-z_]*)\(\);/,
                replace: `return require_react_jsx_runtime_production$1();`,
              },
            ]
          : [
              {
                find: `module.exports = require_react_jsx_dev_runtime_development();`,
                replace: `return require_react_jsx_dev_runtime_development();`,
              },
            ]),
        { find: `process.env.VXRN_REACT_19`, replace: 'false', optional: true },
        {
          find: `Object.assign(exports, eval("require('@vxrn/vendor/react-jsx-19')"));`,
          optional: true,
          replace: ``,
        },
      ])}
    }
    const __mod__ = run()
    ${['jsx', 'jsxs', 'jsxDEV', 'Fragment']
      .map(
        (n) =>
          `export const ${n} = __mod__.${n} || __mod__.jsx || ${(() => {
            // To prevent false warnings about `Each child in a list should have a unique "key" prop` (which can occur when `jsx` and `jsxs` are used in pre-built code within packages installed in node_modules, where JSX has already been transformed),
            // we need to map `jsxs` to `jsxWithValidationStatic` as how it's done here:
            // https://github.com/facebook/react/blob/v18.3.1/fixtures/legacy-jsx-runtimes/react-17/cjs/react-jsx-runtime.development.js#L1202-L1216
            if (n === 'jsxs') {
              return 'function (type, props, key) { return __mod__.jsxDEV(type, props, key, true) }'
            }

            return '__mod__.jsxDEV'
          })()}`
      )
      .join('\n')}
    `
    await FSExtra.writeFile(options.outfile!, outCode)
  })
}

export async function buildReact(options: BuildOptions = {}) {
  const isProd = options.define?.['__DEV__'] === 'false'

  return build({
    bundle: true,
    entryPoints: [requireResolve('react')],
    format: 'cjs',
    target: 'node16',
    jsx: 'transform',
    jsxFactory: 'react',
    allowOverwrite: true,
    platform: 'node',
    define: {
      __DEV__: 'true',
      'process.env.NODE_ENV': `"development"`,
    },
    logLevel: 'warning',
    external,
    ...options,
  }).then(async () => {
    // manual force exports
    const bundled = await readFile(options.outfile!, 'utf-8')
    const outCode = `
    const run = () => {
      ${mustReplace(bundled, [
        isProd
          ? {
              find: /module\.exports = require_react_production([a-z_]*)\(\);/,
              replace: 'return require_react_production$1();',
            }
          : {
              find: /module\.exports = require_react_development([a-z_]*)\(\);/,
              replace: 'return require_react_development$1();',
            },
        {
          find: `process.env.VXRN_REACT_19`,
          optional: true,
          replace: 'false',
        },
        {
          find: `Object.assign(exports, eval("require('@vxrn/vendor/react-19')"));`,
          optional: true,
          replace: ``,
        },
      ])}
    }
    const __mod__ = run()
    ${RExports.map((n) => `export const ${n} = __mod__.${n}`).join('\n')}
    export default __mod__
    `
    await FSExtra.writeFile(options.outfile!, outCode)
  })
}

export async function buildReactNative(
  options: BuildOptions = {},
  {
    platform,
    enableExperimentalReactNativeWithReact19Support = false,
  }: {
    platform: 'ios' | 'android'
    enableExperimentalReactNativeWithReact19Support?: boolean
  }
) {
  return build({
    bundle: true,
    entryPoints: [requireResolve('react-native')],
    format: 'cjs',
    target: 'node20',
    // Note: JSX is actually being transformed by the "remove-flow" plugin defined underneath, not by esbuild. The following JSX options may not actually make a difference.
    jsx: 'transform',
    jsxFactory: 'react',
    allowOverwrite: true,
    platform: 'node',
    external,
    loader: {
      '.png': 'dataurl',
      '.jpg': 'dataurl',
      '.jpeg': 'dataurl',
      '.gif': 'dataurl',
    },
    define: {
      __DEV__: 'true',
      'process.env.NODE_ENV': `"development"`,
    },
    logLevel: 'warning',
    resolveExtensions: [
      `.${platform}.js`,
      '.native.js',
      '.native.ts',
      '.native.tsx',
      '.js',
      '.jsx',
      '.json',
      '.ts',
      '.tsx',
      '.mjs',
    ],
    ...options,
    plugins: [
      {
        name: 'remove-flow',
        setup(build) {
          build.onResolve(
            {
              filter: /HMRClient/,
            },
            async (input) => {
              const path = requireResolve('@vxrn/vite-native-hmr')
              // While node may resolve to the CJS version, it seems that `.naive.js` file exts aren't working if we use that. This might cause problems since in `.cjs` files, `'react-native'` is being replaced with `'react-native-web'` and we need to use `.native.js`.
              // So we try to use the ESM version which this way it seems that `.native.js` will be used.
              const possibleEsmPath = path.replace('/cjs/index.cjs', '/esm/index.native.js')
              if (FSExtra.pathExistsSync(possibleEsmPath)) {
                return { path: possibleEsmPath }
              }
              return { path }
            }
          )

          build.onLoad(
            {
              filter: /.*\.js$/,
            },
            async (input) => {
              if (!input.path.includes('react-native') && !input.path.includes(`vite-native-hmr`)) {
                return
              }

              if (enableExperimentalReactNativeWithReact19Support) {
                // Patch React Native to support React 19 during prebuild
                if (input.path.includes('Libraries/Renderer/implementations/ReactFabric')) {
                  const reactFabricRendererPath = requireResolve(
                    `@vxrn/react-native-prebuilt/vendor/rn-react-19-support/ReactFabric-${input.path.endsWith('-dev.js') ? 'dev' : 'prod'}.js`
                  )

                  return {
                    contents: await readFile(reactFabricRendererPath, 'utf-8'),
                    loader: 'js',
                  }
                }

                if (input.path.includes('Libraries/Renderer/implementations/ReactNativeRenderer')) {
                  const reactNativeRendererPath = requireResolve(
                    `@vxrn/react-native-prebuilt/vendor/rn-react-19-support/ReactNativeRenderer-${input.path.endsWith('-dev.js') ? 'dev' : 'prod'}.js`
                  )

                  return {
                    contents: await readFile(reactNativeRendererPath, 'utf-8'),
                    loader: 'js',
                  }
                }
              }

              const code = await readFile(input.path, 'utf-8')

              // omg so ugly but no class support?
              const outagain = await transformFlow(code, { development: true })

              return {
                contents: outagain,
                loader: 'jsx',
              }
            }
          )
        },
      },
    ],
  }).then(async () => {
    // manual force exports
    const bundled = await readFile(options.outfile!, 'utf-8')
    const outCode = `
    const run = () => {
      ${mustReplace(bundled, [
        {
          find: esbuildCommonJSFunction,
          replace: `
// replaced commonjs function to allow importing internals
var __commonJS = function __commonJS(cb, mod) {
    var path = __getOwnPropNames(cb)[0];
    var modulePath = path.replace(/.*node_modules\\//, '').replace('.js', '');

    var __require = function __require() {
        if (mod) return mod;

        var cachedMod = globalThis["__cachedModules"][modulePath];
        if (cachedMod) return cachedMod;

        var moduleFn = cb[path];
        mod = {
            exports: {}
        };
        moduleFn(mod.exports, mod);
        mod = mod.exports;
        // this is one of our patches basically allowing importing the inner contents:
        globalThis["__cachedModules"][modulePath] = mod;
        return mod;
    };

    // this is another patch basically allowing importing the inner contents:
    if (globalThis['__RN_INTERNAL_MODULE_REQUIRES_MAP__']) {
        globalThis['__RN_INTERNAL_MODULE_REQUIRES_MAP__'][modulePath] = __require;
    }

    return __require;
};
`,
        },
        {
          find: `module.exports = require_react_native();`,
          replace: `return require_react_native();`,
        },
        // Export `@react-native/assets-registry/registry`
        {
          find: `return require_react_native();`,
          replace: [
            `const rn = require_react_native();`,
            `rn.AssetRegistry = require_registry();`,
            `require_ReactNative();`, // This is react-native/Libraries/Renderer/shims/ReactNative.js, we call it here to ensure shims are initialized since we won't lazy load React Native components. See the NOTE below.
            `if (typeof require_InitializeCore === 'function') { require_InitializeCore(); }`, // Since we're accessing the RefreshRuntime directly via `__cachedModules` directly in the RN bundle, we need to ensure it's loaded in time. Note that calling `require_react_refresh_runtime_development()`, `require_setUpReactRefresh()` or `require_setUpDeveloperTools()` directly won't work.
            `return rn;`,
          ].join('\n'),
        },
      ])}
    }
    const RN = run()

    export const REACT_NATIVE_ESM_MANUAL_EXPORTS_START = 'REACT_NATIVE_ESM_MANUAL_EXPORTS_START';${/* NOTE: The `REACT_NATIVE_ESM_MANUAL_EXPORTS_*` vars here are used by other tools to replace exports in this section with a CJS `module.export` which supports dynamic loaded lazy exports, if CJS can be used - such as in a React Native bundle. */ ''}
    ${RNExportNames.map((n) => `export const ${n} = RN.${n}`).join('\n') /* NOTE: React Native exports are designed to be lazy loaded (see: https://github.com/facebook/react-native/blob/v0.77.0-rc.0/packages/react-native/index.js#L106), but while doing so we're calling all the exported getters immediately and executing all the modules at once. */}
    export const REACT_NATIVE_ESM_MANUAL_EXPORTS_END = 'REACT_NATIVE_ESM_MANUAL_EXPORTS_END';
    `
    await FSExtra.writeFile(options.outfile!, outCode)
  })
}

const esbuildCommonJSFunction = `var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};`

export const RNExportNames = [
  'registerCallableModule',
  'AccessibilityInfo',
  'ActivityIndicator',
  'Button',
  'DrawerLayoutAndroid',
  'FlatList',
  'Image',
  'ImageBackground',
  'InputAccessoryView',
  'KeyboardAvoidingView',
  'Modal',
  'Pressable',
  'RefreshControl',
  'SafeAreaView',
  'ScrollView',
  'SectionList',
  'StatusBar',
  'Switch',
  'Text',
  'TextInput',
  'Touchable',
  'TouchableHighlight',
  'TouchableNativeFeedback',
  'TouchableOpacity',
  'TouchableWithoutFeedback',
  'View',
  'VirtualizedList',
  'VirtualizedSectionList',
  'ActionSheetIOS',
  'Alert',
  'Animated',
  'Appearance',
  'AppRegistry',
  'AppState',
  'BackHandler',
  'DeviceInfo',
  'DevSettings',
  'Dimensions',
  'Easing',
  'findNodeHandle',
  'I18nManager',
  'InteractionManager',
  'Keyboard',
  'LayoutAnimation',
  'Linking',
  'LogBox',
  'NativeDialogManagerAndroid',
  'NativeEventEmitter',
  'Networking',
  'PanResponder',
  'PermissionsAndroid',
  'PixelRatio',
  'Settings',
  'Share',
  'StyleSheet',
  'Systrace',
  'ToastAndroid',
  'TurboModuleRegistry',
  'UIManager',
  'unstable_batchedUpdates',
  'useAnimatedValue',
  'useColorScheme',
  'useWindowDimensions',
  'UTFSequence',
  'Vibration',
  'YellowBox',
  'DeviceEventEmitter',
  'DynamicColorIOS',
  'NativeAppEventEmitter',
  'NativeModules',
  'Platform',
  'PlatformColor',
  'processColor',
  'requireNativeComponent',
  'RootTagContext',
  'unstable_enableLogBox',
  'AssetRegistry', // Normally not exported by React Native, but with a hack we make @react-native/assets-registry/registry available here.
]

export const RExports = [
  'Children',
  'Component',
  'Fragment',
  'Profiler',
  'PureComponent',
  'StrictMode',
  'Suspense',
  '__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED', // For React 18
  '__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE', // For React 19
  'cloneElement',
  'createContext',
  'createElement',
  'createFactory',
  'createRef',
  'forwardRef',
  'isValidElement',
  'lazy',
  'memo',
  'startTransition',
  'unstable_act',
  'useCallback',
  'useContext',
  'useDebugValue',
  'useDeferredValue',
  'useEffect',
  'useId',
  'useImperativeHandle',
  'useInsertionEffect',
  'useLayoutEffect',
  'useMemo',
  'useReducer',
  'useRef',
  'useState',
  'useSyncExternalStore',
  'useTransition',
  'version',
  // Added in React 19
  'act',
  'cache',
  'unstable_useCacheRefresh',
  'use',
  'useActionState',
  'useOptimistic',
]
