import { readFile } from 'node:fs/promises'

import { transformFlow } from '@vxrn/vite-flow'
import { build, type BuildOptions } from 'esbuild'
import FSExtra from 'fs-extra'

import { createRequire } from 'node:module'

const requireResolve =
  'url' in import.meta ? createRequire(import.meta.url).resolve : require.resolve

const external = ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime']

export async function buildAll() {
  console.info(`Prebuilding React Native (one time cost...)`)
  await Promise.all([
    //
    buildReactJSX(),
    buildReact(),
    buildReactNative(),
  ])
}

export async function buildReactJSX(options: BuildOptions = {}) {
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
      ${bundled
        .replace(
          `module.exports = require_react_jsx_dev_runtime_development();`,
          `return require_react_jsx_dev_runtime_development();`
        )
        .replace(
          `module.exports = require_react_jsx_runtime_production_min();`,
          `return require_react_jsx_runtime_production_min();`
        )
        .replace(`process.env.VXRN_REACT_19`, 'false')
        .replace(`Object.assign(exports, eval("require('@vxrn/vendor/react-jsx-19')"));`, ``)}
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
      ${bundled
        .replace(
          /module\.exports = require_react_development(\d*)\(\);/,
          'return require_react_development$1();'
        )
        .replace(
          /module\.exports = require_react_production_min(\d*)\(\);/,
          'return require_react_production_min$1();'
        )
        .replace(`process.env.VXRN_REACT_19`, 'false')
        .replace(`Object.assign(exports, eval("require('@vxrn/vendor/react-19')"));`, ``)}
    }
    const __mod__ = run()
    ${RExports.map((n) => `export const ${n} = __mod__.${n}`).join('\n')}
    export default __mod__
    `
    await FSExtra.writeFile(options.outfile!, outCode)
  })
}

export async function buildReactNative(options: BuildOptions = {}) {
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
      '.ios.js',
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
              filter: /.*.js/,
            },
            async (input) => {
              if (!input.path.includes('react-native') && !input.path.includes(`vite-native-hmr`)) {
                return
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
      ${bundled
        .replace(
          esbuildCommonJSFunction,
          `
// replaced commonjs function to allow importing internals
var __commonJS = (cb, mod) => function __require() {
if (mod) return mod
const path = __getOwnPropNames(cb)[0]
const moduleFn = cb[path]
mod = { exports: {} }
moduleFn(mod.exports, mod)
mod = mod.exports

// this is our patch basically allowing importing the inner contents:
globalThis['__cachedModules'][path.replace(/.*node_modules\\//, '').replace('.js', '')] = mod

return mod
};
`
        )
        .replace(`module.exports = require_react_native();`, `return require_react_native();`)
        // Export `@react-native/assets-registry/registry`
        .replace(
          `return require_react_native();`,
          `const rn = require_react_native(); rn.AssetRegistry = require_registry(); return rn;`
        )}
    }
    const RN = run()
    ${RNExportNames.map((n) => `export const ${n} = RN.${n}`).join('\n')}
    `
    await FSExtra.writeFile(options.outfile!, outCode)
  })
}

const esbuildCommonJSFunction = `var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};`

const RNExportNames = [
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

const RExports = [
  'Children',
  'Component',
  'Fragment',
  'Profiler',
  'PureComponent',
  'StrictMode',
  'Suspense',
  '__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED',
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
]
