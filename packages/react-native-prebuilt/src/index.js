import { readFile } from 'node:fs/promises';
import { mustReplace } from '@vxrn/utils';
import { transformFlow } from '@vxrn/vite-flow';
import { build } from 'esbuild';
import FSExtra from 'fs-extra';
import { createRequire } from 'node:module';
const requireResolve = 'url' in import.meta ? createRequire(import.meta.url).resolve : require.resolve;
const external = ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime'];
export async function buildReactJSX(options = {}) {
    const isProd = options.define?.['__DEV__'] === 'false';
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
        const bundled = await readFile(options.outfile, 'utf-8');
        const outCode = `
    const run = () => {
      ${mustReplace(bundled, [
            isProd
                ? {
                    find: `module.exports = require_react_jsx_runtime_production_min();`,
                    replace: `return require_react_jsx_runtime_production_min();`,
                }
                : {
                    find: `module.exports = require_react_jsx_dev_runtime_development();`,
                    replace: `return require_react_jsx_dev_runtime_development();`,
                },
            { find: `process.env.VXRN_REACT_19`, replace: 'false' },
            {
                find: `Object.assign(exports, eval("require('@vxrn/vendor/react-jsx-19')"));`,
                replace: ``,
            },
        ])}
    }
    const __mod__ = run()
    ${['jsx', 'jsxs', 'jsxDEV', 'Fragment']
            .map((n) => `export const ${n} = __mod__.${n} || __mod__.jsx || ${(() => {
            // To prevent false warnings about `Each child in a list should have a unique "key" prop` (which can occur when `jsx` and `jsxs` are used in pre-built code within packages installed in node_modules, where JSX has already been transformed),
            // we need to map `jsxs` to `jsxWithValidationStatic` as how it's done here:
            // https://github.com/facebook/react/blob/v18.3.1/fixtures/legacy-jsx-runtimes/react-17/cjs/react-jsx-runtime.development.js#L1202-L1216
            if (n === 'jsxs') {
                return 'function (type, props, key) { return __mod__.jsxDEV(type, props, key, true) }';
            }
            return '__mod__.jsxDEV';
        })()}`)
            .join('\n')}
    `;
        await FSExtra.writeFile(options.outfile, outCode);
    });
}
export async function buildReact(options = {}) {
    const isProd = options.define?.['__DEV__'] === 'false';
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
        const bundled = await readFile(options.outfile, 'utf-8');
        const outCode = `
    const run = () => {
      ${mustReplace(bundled, [
            isProd
                ? {
                    find: /module\.exports = require_react_production_min(\d*)\(\);/,
                    replace: 'return require_react_production_min$1();',
                }
                : {
                    find: /module\.exports = require_react_development(\d*)\(\);/,
                    replace: 'return require_react_development$1();',
                },
            {
                find: `process.env.VXRN_REACT_19`,
                replace: 'false',
            },
            {
                find: `Object.assign(exports, eval("require('@vxrn/vendor/react-19')"));`,
                replace: ``,
            },
        ])}
    }
    const __mod__ = run()
    ${RExports.map((n) => `export const ${n} = __mod__.${n}`).join('\n')}
    export default __mod__
    `;
        await FSExtra.writeFile(options.outfile, outCode);
    });
}
export async function buildReactNative(options = {}, { platform }) {
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
                    build.onResolve({
                        filter: /HMRClient/,
                    }, async (input) => {
                        const path = requireResolve('@vxrn/vite-native-hmr');
                        // While node may resolve to the CJS version, it seems that `.naive.js` file exts aren't working if we use that. This might cause problems since in `.cjs` files, `'react-native'` is being replaced with `'react-native-web'` and we need to use `.native.js`.
                        // So we try to use the ESM version which this way it seems that `.native.js` will be used.
                        const possibleEsmPath = path.replace('/cjs/index.cjs', '/esm/index.native.js');
                        if (FSExtra.pathExistsSync(possibleEsmPath)) {
                            return { path: possibleEsmPath };
                        }
                        return { path };
                    });
                    build.onLoad({
                        filter: /.*\.js$/,
                    }, async (input) => {
                        if (!input.path.includes('react-native') && !input.path.includes(`vite-native-hmr`)) {
                            return;
                        }
                        const code = await readFile(input.path, 'utf-8');
                        // omg so ugly but no class support?
                        const outagain = await transformFlow(code, { development: true });
                        return {
                            contents: outagain,
                            loader: 'jsx',
                        };
                    });
                },
            },
        ],
    }).then(async () => {
        // manual force exports
        const bundled = await readFile(options.outfile, 'utf-8');
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

    export const REACT_NATIVE_ESM_MANUAL_EXPORTS_START = 'REACT_NATIVE_ESM_MANUAL_EXPORTS_START';${ /* NOTE: The `REACT_NATIVE_ESM_MANUAL_EXPORTS_*` vars here are used by other tools to replace exports in this section with a CJS `module.export` which supports dynamic loaded lazy exports, if CJS can be used - such as in a React Native bundle. */''}
    ${RNExportNames.map((n) => `export const ${n} = RN.${n}`).join('\n') /* NOTE: React Native exports are designed to be lazy loaded (see: https://github.com/facebook/react-native/blob/v0.77.0-rc.0/packages/react-native/index.js#L106), but while doing so we're calling all the exported getters immediately and executing all the modules at once. */}
    export const REACT_NATIVE_ESM_MANUAL_EXPORTS_END = 'REACT_NATIVE_ESM_MANUAL_EXPORTS_END';
    `;
        await FSExtra.writeFile(options.outfile, outCode);
    });
}
const esbuildCommonJSFunction = `var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};`;
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
];
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
];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFDM0MsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGFBQWEsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDL0MsT0FBTyxFQUFFLEtBQUssRUFBcUIsTUFBTSxTQUFTLENBQUE7QUFDbEQsT0FBTyxPQUFPLE1BQU0sVUFBVSxDQUFBO0FBRTlCLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxhQUFhLENBQUE7QUFFM0MsTUFBTSxjQUFjLEdBQ2xCLEtBQUssSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUE7QUFFakYsTUFBTSxRQUFRLEdBQUcsQ0FBQyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsdUJBQXVCLENBQUMsQ0FBQTtBQUV4RSxNQUFNLENBQUMsS0FBSyxVQUFVLGFBQWEsQ0FBQyxVQUF3QixFQUFFO0lBQzVELE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxTQUFTLENBQUMsS0FBSyxPQUFPLENBQUE7SUFFdEQsT0FBTyxLQUFLLENBQUM7UUFDWCxNQUFNLEVBQUUsSUFBSTtRQUNaLFdBQVcsRUFBRSxDQUFDLGNBQWMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1FBQ3RELE1BQU0sRUFBRSxLQUFLO1FBQ2IsTUFBTSxFQUFFLFFBQVE7UUFDaEIsR0FBRyxFQUFFLFdBQVc7UUFDaEIsVUFBVSxFQUFFLE9BQU87UUFDbkIsY0FBYyxFQUFFLElBQUk7UUFDcEIsUUFBUSxFQUFFLE1BQU07UUFDaEIsTUFBTSxFQUFFO1lBQ04sT0FB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