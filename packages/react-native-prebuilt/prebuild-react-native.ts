import { readFile } from 'fs/promises'

import * as babel from '@babel/core'
import { build } from 'esbuild'
import { writeFile } from 'fs-extra'
import { imageSize } from 'image-size'
import { relative, extname, basename, dirname, join } from 'path'
import { createHash } from 'crypto'

export function getImageSize(resourcePath: string): {
  width?: number
  height?: number
} {
  try {
    let { width, height } = imageSize(resourcePath)

    return { width, height }
  } catch {
    return {
      width: 0,
      height: 0,
    }
  }
}

const SCALABLE_ASSETS = ['bmp', 'gif', 'jpg', 'jpeg', 'png', 'psd', 'svg', 'webp', 'tiff']

run()

async function nativeBabelFlowTransform(input: string) {
  return await new Promise<string>((res, rej) => {
    babel.transform(
      input,
      {
        presets: ['module:metro-react-native-babel-preset'],
      },
      (err: any, result) => {
        if (!result || err) rej(err || 'no res')
        res(result!.code!)
      }
    )
  })
}

async function run() {
  console.info(`Prebuilding React Native (one time cost...)`)

  const outPath = './dist/react-native.js'
  const reactOutPath = './dist/react.js'
  const reactJsxOutPath = './dist/react-jsx-runtime.js'
  const external = ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime']

  const assetsLoader = SCALABLE_ASSETS.reduce((obj, item) => {
    obj['.' + item] = 'file'
    return obj
  }, {})

  await Promise.all([
    build({
      bundle: true,
      entryPoints: [require.resolve('react')],
      outfile: reactOutPath,
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
    }).then(async () => {
      // manual force exports
      const bundled = await readFile(reactOutPath, 'utf-8')
      const outCode = `
      const run = () => {
        ${bundled.replace(
          `module.exports = require_react_development();`,
          `return require_react_development();`
        )}
      }
      const __mod__ = run()
      ${RExports.map((n) => `export const ${n} = __mod__.${n}`).join('\n')}
      export default __mod__
      `
      await writeFile(reactOutPath, outCode)
    }),
    build({
      bundle: true,
      entryPoints: [require.resolve('react/jsx-dev-runtime')],
      outfile: reactJsxOutPath,
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
    }).then(async () => {
      // manual force exports
      const bundled = await readFile(reactJsxOutPath, 'utf-8')
      const outCode = `
      const run = () => {
        ${bundled.replace(
          `module.exports = require_react_jsx_dev_runtime_development();`,
          `return require_react_jsx_dev_runtime_development();`
        )}
      }
      const __mod__ = run()
      ${['jsx', 'jsxs', 'jsxDEV', 'Fragment']
        .map((n) => `export const ${n} = __mod__.${n} || __mod__.jsx || __mod__.jsxDEV`)
        .join('\n')}
      `
      await writeFile(reactJsxOutPath, outCode)
    }),

    build({
      bundle: true,
      entryPoints: [require.resolve('react-native')],
      outfile: outPath,
      format: 'cjs',
      target: 'node20',
      jsx: 'transform',
      jsxFactory: 'react',
      allowOverwrite: true,
      platform: 'node',
      external,
      loader: assetsLoader,
      assetNames: '[dir]/[name]',
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
      plugins: [
        {
          name: 'remove-flow',
          setup(build) {
            build.onResolve(
              {
                filter: /HMRClient/,
              },
              async (input) => {
                return {
                  path: require.resolve('@vxrn/vite-native-hmr'),
                }
              }
            )

            build.onLoad(
              {
                filter: /.*.js/,
              },
              async (input) => {
                if (
                  !input.path.includes('react-native') &&
                  !input.path.includes(`vite-native-hmr`)
                ) {
                  return
                }

                const code = await readFile(input.path, 'utf-8')

                // omg so ugly but no class support?
                const outagain = await nativeBabelFlowTransform(code)

                return {
                  contents: outagain,
                  loader: 'jsx',
                }
              }
            )
          },
        },
        {
          name: 'assets',
          setup(build) {
            build.onLoad(
              {
                filter: new RegExp(`\\.(${SCALABLE_ASSETS.join('|')})$`),
              },
              async (input) => {
                const hash = createHash('md5').update(input.path).digest('hex')
                const { width, height } = getImageSize(input.path)

                const publicPath = 'assets'
                const marker = 'react-native'

                const resourceDirname = input.path.substring(input.path.indexOf(marker))
                const extension = extname(input.path)

                /* TODO: properly receive scales and devServerEnabled (not sure if that's possible here) */

                const code = `
                var AssetRegistry = require('react-native/Libraries/Image/AssetRegistry');

                module.exports = AssetRegistry.registerAsset({
                  __packager_asset: true,
                  scales: [1],
                  name: ${JSON.stringify(basename(input.path).replace(extension, ''))},
                  type: ${JSON.stringify(extension).replace('.', '')},
                  hash: ${JSON.stringify(hash)},
                  httpServerLocation: ${JSON.stringify(
                    join(publicPath, dirname(resourceDirname))
                  )},
                  fileSystemLocation: ${JSON.stringify(dirname(input.path))},
                  ${height ? `height: ${height},` : ''}
                  ${width ? `width: ${width},` : ''}
                });
                `

                return {
                  contents: code,
                  loader: 'js',
                }
              }
            )
          },
        },
      ],
    }).then(async () => {
      // manual force exports
      const bundled = await readFile(outPath, 'utf-8')
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
  globalThis['__cachedModules'][path.replace('../../node_modules/', '').replace('.js', '')] = mod

  return mod
};
`
          )
          .replace(
            `module.exports = require_react_native();`,
            `return require_react_native();`
          )}
      }
      const RN = run()
      ${RNExportNames.map((n) => `export const ${n} = RN.${n}`).join('\n')}
      `
      await writeFile(outPath, outCode)
    }),
  ])
}

const esbuildCommonJSFunction = `var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};`

const RNExportNames = [
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
