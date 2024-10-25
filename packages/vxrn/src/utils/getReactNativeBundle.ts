import FSExtra from 'fs-extra'
import { readFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import type { RollupCache } from 'rollup'
import { createBuilder } from 'vite'
import { buildEnvironment } from './fork/vite/build'
import type { VXRNOptionsFilled } from './getOptionsFilled'
import { getReactNativeConfig } from './getReactNativeConfig'
import { isBuildingNativeBundle, setIsBuildingNativeBundle } from './isBuildingNativeBundle'
import { prebuildReactNativeModules } from './swapPrebuiltReactModules'
import { resolvePath } from '@vxrn/resolve'

const { pathExists } = FSExtra

// used for normalizing hot reloads
export let entryRoot = ''

const cache: Record<string, RollupCache> = {}

export async function getReactNativeBundle(
  options: VXRNOptionsFilled,
  internal: { mode?: 'dev' | 'prod'; assetsDest?: string; useCache?: boolean } = {
    mode: 'dev',
    useCache: true,
  }
) {
  entryRoot = options.root

  if (process.env.LOAD_TMP_BUNDLE) {
    // for easier quick testing things:
    const tmpBundle = join(process.cwd(), 'bundle.tmp.js')
    if (await pathExists(tmpBundle)) {
      console.info('⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️ returning temp bundle ⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️', tmpBundle)
      return await readFile(tmpBundle, 'utf-8')
    }
  }

  await prebuildReactNativeModules(options.cacheDir, {
    // TODO: a better way to pass the mode (dev/prod) to PrebuiltReactModules
    mode: internal.mode,
  })

  if (isBuildingNativeBundle) {
    const res = await isBuildingNativeBundle
    return res
  }

  let done
  setIsBuildingNativeBundle(
    new Promise((res) => {
      done = res
    })
  )

  // build app
  const nativeBuildConfig = await getReactNativeConfig(options, internal)

  const builder = await createBuilder(nativeBuildConfig)

  const environmentName = 'ios' as const
  const environment = builder.environments[environmentName]

  const rollupCacheFile = join(options.cacheDir, `rn-rollup-cache-${environmentName}.json`)

  if (internal.useCache && !process.env.VXRN_DISABLE_CACHE) {
    // See: https://rollupjs.org/configuration-options/#cache
    environment.config.build.rollupOptions.cache =
      cache[environmentName] ||
      (await (async () => {
        // Try to load Rollup cache from disk
        try {
          if (await pathExists(rollupCacheFile)) {
            const c = await FSExtra.readJSON(rollupCacheFile, { reviver: bigIntReviver })
            return c
          }
        } catch (e) {
          console.error(`Error loading Rollup cache from ${rollupCacheFile}: ${e}`)
        }

        return null
      })()) ||
      true /* to initially enable Rollup cache */
  }

  // We are using a forked version of the Vite internal function `buildEnvironment` (which is what `builder.build` calls) that will return the Rollup cache object with the build output, and also with some performance improvements.
  const buildOutput = await buildEnvironment(environment.config, environment)
  const { cache: currentCache } = buildOutput
  if (currentCache) {
    // Do not cache some virtual modules that can dynamically change without an corresponding change in the source code to invalidate the cache.
    currentCache.modules = currentCache.modules.filter((m) => !m.id.endsWith('one-entry-native'))
    cache[environmentName] = currentCache

    // do not await cache write
    ;(async () => {
      if (!internal.useCache) return

      try {
        await FSExtra.writeJSON(rollupCacheFile, currentCache, { replacer: bigIntReplacer })
      } catch (e) {
        console.error(`Error saving Rollup cache to ${rollupCacheFile}: ${e}`)
      }
    })()
  }

  if (!('output' in buildOutput)) {
    throw `❌`
  }

  let appCode = buildOutput.output
    // entry last
    .sort((a, b) => (a['isEntry'] ? 1 : a['fileName'].localeCompare(b['fileName']) + -2))
    .map((outputModule) => {
      const id = outputModule.fileName.replace(/.*node_modules\//, '')

      if (outputModule.type == 'chunk') {
        const importsMap = {}
        for (const imp of outputModule.imports) {
          const relativePath = relative(dirname(id), imp)
          importsMap[relativePath[0] === '.' ? relativePath : './' + relativePath] = imp.replace(
            /.*node_modules\//,
            ''
          )
        }

        let code = outputModule.code

        // A hacky way to exclude node-fetch from the bundle.
        //
        // Some part of Supabase SDK will import node-fetch statically (https://github.com/supabase/supabase-js/blob/v2.45.1/src/lib/fetch.ts#L2), or dynamically (https://github.com/supabase/auth-js/blob/8222ee198a0ab10570e8b4c31ffb2aeafef86392/src/lib/helpers.ts#L99), causing the node-fetch to be included in the bundle, and while imported statically it will throw a runtime error when running on React Native.
        if (outputModule.facadeModuleId?.includes('@supabase/node-fetch')) {
          // This should be safe since the imported '@supabase/node-fetch' will not actually be used in Supabase SDK as there's already a global `fetch` in React Native.
          code = ''
        }

        return `
// id: ${id}
// name: ${outputModule.name}
// facadeModuleId: ${outputModule.facadeModuleId}
// fileName: ${outputModule.fileName}
___vxrnAbsoluteToRelative___["${outputModule.facadeModuleId}"] = "${id}"
___modules___["${id}"] = ((exports, module) => {
const require = createRequire("${id}", ${JSON.stringify(importsMap, null, 2)})

${code}
})

${
  outputModule.isEntry
    ? `
// run entry
const __require = createRequire(":root:", {})
__require("react-native")
__require("${id}")
`
    : ''
}
`
      }
    })
    .join('\n')

  if (!appCode) {
    throw `❌`
  }

  appCode = appCode
    // TEMP FIX for router tamagui thing since expo router 3 upgrade
    .replaceAll('dist/esm/index.mjs"', 'dist/esm/index.js"')
    // turn eager imports of RN back into lazy imports
    // we needed them eager so rollup isnt unhappy with missing exports, now we need them lazy again
    // so react native doesn't get unhappy on v76 with:
    // Codegen didn't run for RNCSafeAreaView. This will be an error in the future. Make sure you are using @react-native/babel-preset when building your JavaScript code.
    .replace(
      RNEagerImports,
      `
module.exports = RN;
  `
    )

  const template = await getReactNativeTemplate(internal.mode || 'dev')

  const out = template + appCode

  done(out)
  setIsBuildingNativeBundle(null)

  return out
}

const RNEagerImports = `var registerCallableModule = RN.registerCallableModule;
var AccessibilityInfo = RN.AccessibilityInfo;
var ActivityIndicator = RN.ActivityIndicator;
var Button = RN.Button;
var DrawerLayoutAndroid = RN.DrawerLayoutAndroid;
var FlatList = RN.FlatList;
var Image = RN.Image;
var ImageBackground = RN.ImageBackground;
var InputAccessoryView = RN.InputAccessoryView;
var KeyboardAvoidingView = RN.KeyboardAvoidingView;
var Modal = RN.Modal;
var Pressable = RN.Pressable;
var RefreshControl = RN.RefreshControl;
var SafeAreaView = RN.SafeAreaView;
var ScrollView = RN.ScrollView;
var SectionList = RN.SectionList;
var StatusBar = RN.StatusBar;
var Switch = RN.Switch;
var Text = RN.Text;
var TextInput = RN.TextInput;
var Touchable = RN.Touchable;
var TouchableHighlight = RN.TouchableHighlight;
var TouchableNativeFeedback = RN.TouchableNativeFeedback;
var TouchableOpacity = RN.TouchableOpacity;
var TouchableWithoutFeedback = RN.TouchableWithoutFeedback;
var View = RN.View;
var VirtualizedList = RN.VirtualizedList;
var VirtualizedSectionList = RN.VirtualizedSectionList;
var ActionSheetIOS = RN.ActionSheetIOS;
var Alert = RN.Alert;
var Animated = RN.Animated;
var Appearance = RN.Appearance;
var AppRegistry = RN.AppRegistry;
var AppState = RN.AppState;
var BackHandler = RN.BackHandler;
var DeviceInfo = RN.DeviceInfo;
var DevSettings = RN.DevSettings;
var Dimensions = RN.Dimensions;
var Easing = RN.Easing;
var findNodeHandle = RN.findNodeHandle;
var I18nManager = RN.I18nManager;
var InteractionManager = RN.InteractionManager;
var Keyboard = RN.Keyboard;
var LayoutAnimation = RN.LayoutAnimation;
var Linking = RN.Linking;
var LogBox = RN.LogBox;
var NativeDialogManagerAndroid = RN.NativeDialogManagerAndroid;
var NativeEventEmitter = RN.NativeEventEmitter;
var Networking = RN.Networking;
var PanResponder = RN.PanResponder;
var PermissionsAndroid = RN.PermissionsAndroid;
var PixelRatio = RN.PixelRatio;
var Settings = RN.Settings;
var Share = RN.Share;
var StyleSheet = RN.StyleSheet;
var Systrace = RN.Systrace;
var ToastAndroid = RN.ToastAndroid;
var TurboModuleRegistry = RN.TurboModuleRegistry;
var UIManager = RN.UIManager;
var unstable_batchedUpdates = RN.unstable_batchedUpdates;
var useAnimatedValue = RN.useAnimatedValue;
var useColorScheme = RN.useColorScheme;
var useWindowDimensions = RN.useWindowDimensions;
var UTFSequence = RN.UTFSequence;
var Vibration = RN.Vibration;
var YellowBox = RN.YellowBox;
var DeviceEventEmitter = RN.DeviceEventEmitter;
var DynamicColorIOS = RN.DynamicColorIOS;
var NativeAppEventEmitter = RN.NativeAppEventEmitter;
var NativeModules = RN.NativeModules;
var Platform = RN.Platform;
var PlatformColor = RN.PlatformColor;
var processColor = RN.processColor;
var requireNativeComponent = RN.requireNativeComponent;
var RootTagContext = RN.RootTagContext;
var unstable_enableLogBox = RN.unstable_enableLogBox;
var AssetRegistry = RN.AssetRegistry;

exports.AccessibilityInfo = AccessibilityInfo;
exports.ActionSheetIOS = ActionSheetIOS;
exports.ActivityIndicator = ActivityIndicator;
exports.Alert = Alert;
exports.Animated = Animated;
exports.AppRegistry = AppRegistry;
exports.AppState = AppState;
exports.Appearance = Appearance;
exports.AssetRegistry = AssetRegistry;
exports.BackHandler = BackHandler;
exports.Button = Button;
exports.DevSettings = DevSettings;
exports.DeviceEventEmitter = DeviceEventEmitter;
exports.DeviceInfo = DeviceInfo;
exports.Dimensions = Dimensions;
exports.DrawerLayoutAndroid = DrawerLayoutAndroid;
exports.DynamicColorIOS = DynamicColorIOS;
exports.Easing = Easing;
exports.FlatList = FlatList;
exports.I18nManager = I18nManager;
exports.Image = Image;
exports.ImageBackground = ImageBackground;
exports.InputAccessoryView = InputAccessoryView;
exports.InteractionManager = InteractionManager;
exports.Keyboard = Keyboard;
exports.KeyboardAvoidingView = KeyboardAvoidingView;
exports.LayoutAnimation = LayoutAnimation;
exports.Linking = Linking;
exports.LogBox = LogBox;
exports.Modal = Modal;
exports.NativeAppEventEmitter = NativeAppEventEmitter;
exports.NativeDialogManagerAndroid = NativeDialogManagerAndroid;
exports.NativeEventEmitter = NativeEventEmitter;
exports.NativeModules = NativeModules;
exports.Networking = Networking;
exports.PanResponder = PanResponder;
exports.PermissionsAndroid = PermissionsAndroid;
exports.PixelRatio = PixelRatio;
exports.Platform = Platform;
exports.PlatformColor = PlatformColor;
exports.Pressable = Pressable;
exports.RefreshControl = RefreshControl;
exports.RootTagContext = RootTagContext;
exports.SafeAreaView = SafeAreaView;
exports.ScrollView = ScrollView;
exports.SectionList = SectionList;
exports.Settings = Settings;
exports.Share = Share;
exports.StatusBar = StatusBar;
exports.StyleSheet = StyleSheet;
exports.Switch = Switch;
exports.Systrace = Systrace;
exports.Text = Text;
exports.TextInput = TextInput;
exports.ToastAndroid = ToastAndroid;
exports.Touchable = Touchable;
exports.TouchableHighlight = TouchableHighlight;
exports.TouchableNativeFeedback = TouchableNativeFeedback;
exports.TouchableOpacity = TouchableOpacity;
exports.TouchableWithoutFeedback = TouchableWithoutFeedback;
exports.TurboModuleRegistry = TurboModuleRegistry;
exports.UIManager = UIManager;
exports.UTFSequence = UTFSequence;
exports.Vibration = Vibration;
exports.View = View;
exports.VirtualizedList = VirtualizedList;
exports.VirtualizedSectionList = VirtualizedSectionList;
exports.YellowBox = YellowBox;
exports.findNodeHandle = findNodeHandle;
exports.processColor = processColor;
exports.registerCallableModule = registerCallableModule;
exports.requireNativeComponent = requireNativeComponent;
exports.unstable_batchedUpdates = unstable_batchedUpdates;
exports.unstable_enableLogBox = unstable_enableLogBox;
exports.useAnimatedValue = useAnimatedValue;
exports.useColorScheme = useColorScheme;
exports.useWindowDimensions = useWindowDimensions;`

/**
 * Get `react-native-template.js` with some `process.env.*` replaced with static values.
 */
async function getReactNativeTemplate(mode: 'dev' | 'prod') {
  const templateFile = resolvePath('vxrn/react-native-template.js')
  const template = await readFile(templateFile, 'utf-8')

  return template.replace(/process\.env\.__DEV__/g, mode === 'dev' ? 'true' : 'false')
}

function bigIntReplacer(_key: string, value: any): any {
  if (typeof value === 'bigint') {
    return '__BigInt__:' + value.toString() + 'n'
  }
  return value
}

function bigIntReviver(_key: string, value: any): any {
  if (typeof value === 'string' && /^__BigInt__:\d+n$/.test(value)) {
    return BigInt(value.slice(11, -1))
  }
  return value
}
