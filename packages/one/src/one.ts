// public One namespaces. platform-specific entries keep the names and prop
// contracts of their native frameworks; shared components live under UI.

import {
  Auth,
  Browser as NativeBrowser,
  Widgets,
  LiveActivities,
  LocalAuthentication,
  Location,
  WidgetUI,
  Clipboard as NativeClipboard,
  AppInfo,
  Color,
  Database,
  Compose,
  Fonts,
  DocumentPicker,
  Haptics,
  ImagePicker,
  MenuAction,
  Menu as NativeMenu,
  ContextMenu as NativeContextMenu,
  Notifications,
  Network as NativeNetwork,
  SecureStore as NativeSecureStore,
  Speech as NativeSpeech,
  Updates as NativeUpdates,
  SplitView,
  Swift,
  TextInput,
  ToolbarHost,
  ToolbarItem,
  UI as NativeUI,
  getHinge,
  getSizeClass,
  onHingeChange,
  ReservedRegions,
  useHinge,
  useReservedRegions,
  useReservedRegionsReady,
  useSizeClass,
  useSpanning,
  useWindowSegments,
  ZoomTransitionAlignmentRectDetector,
  ZoomTransitionEnabler,
  ZoomTransitionSource,
  type ColorType,
  useFonts,
  useNativeState,
  useNetworkState,
} from './platform'
import {
  SafeAreaProvider,
  SafeAreaView,
  initialWindowMetrics,
  useSafeAreaFrame,
  useSafeAreaInsets,
} from './safe-area-context'

export type OnePlatform = 'web' | 'ios' | 'android' | 'rnx'

export type OneIOS = typeof Swift & {
  readonly Widgets: typeof Widgets
  readonly LiveActivities: typeof LiveActivities
  readonly WidgetUI: typeof WidgetUI
  readonly LocalAuthentication: typeof LocalAuthentication
  readonly Location: typeof Location
  readonly Color: ColorType['ios']
  readonly MenuAction: typeof MenuAction
  readonly SplitView: typeof SplitView
  readonly ToolbarHost: typeof ToolbarHost
  // the UIBarButtonItem inside a ToolbarHost; One.iOS.ToolbarItem is SwiftUI's,
  // inside One.iOS.Toolbar.
  readonly BarButtonItem: typeof ToolbarItem
  readonly ZoomTransitionAlignmentRectDetector: typeof ZoomTransitionAlignmentRectDetector
  readonly ZoomTransitionEnabler: typeof ZoomTransitionEnabler
  readonly ZoomTransitionSource: typeof ZoomTransitionSource
}

export type OneAndroid = typeof Compose & {
  readonly Color: ColorType['android']
  readonly Menu: typeof NativeMenu
  readonly ContextMenu: typeof NativeContextMenu
}

export type OneSafeArea = {
  readonly Provider: typeof SafeAreaProvider
  readonly View: typeof SafeAreaView
  readonly initialMetrics: typeof initialWindowMetrics
}

export type OneUI = typeof NativeUI & {
  readonly Fonts: typeof Fonts
  readonly SafeArea: Readonly<OneSafeArea>
  readonly TextInput: typeof TextInput
  readonly ReservedRegions: typeof ReservedRegions
}

export type OneNotifications = typeof Notifications

export type OneAPI = {
  readonly platform: OnePlatform
  readonly AppInfo: typeof AppInfo
  readonly Database: typeof Database
  readonly iOS: Readonly<OneIOS>
  readonly Android: Readonly<OneAndroid>
  readonly UI: Readonly<OneUI>
  readonly Notifications: Readonly<OneNotifications>
  readonly Clipboard: typeof NativeClipboard
  readonly Haptics: typeof Haptics
  readonly Network: typeof NativeNetwork
  readonly Auth: typeof Auth
  readonly Browser: typeof NativeBrowser
  readonly ImagePicker: typeof ImagePicker
  readonly DocumentPicker: typeof DocumentPicker
  readonly SecureStore: typeof NativeSecureStore
  readonly Speech: typeof NativeSpeech
  readonly Updates: typeof NativeUpdates
  readonly useFonts: typeof useFonts
  readonly useNativeState: typeof useNativeState
  readonly useNetworkState: typeof useNetworkState
  readonly useSafeAreaFrame: typeof useSafeAreaFrame
  readonly useSafeAreaInsets: typeof useSafeAreaInsets
  readonly useSizeClass: typeof useSizeClass
  readonly getSizeClass: typeof getSizeClass
  readonly useHinge: typeof useHinge
  readonly getHinge: typeof getHinge
  readonly onHingeChange: typeof onHingeChange
  readonly useReservedRegions: typeof useReservedRegions
  readonly useReservedRegionsReady: typeof useReservedRegionsReady
  readonly useWindowSegments: typeof useWindowSegments
  readonly useSpanning: typeof useSpanning
}

function currentPlatform(): OnePlatform {
  const defined =
    Reflect.get(globalThis, '__ONE_PLATFORM__') ??
    (typeof process !== 'undefined' ? process.env.ONE_PLATFORM : undefined)
  return defined === 'ios' || defined === 'android' || defined === 'rnx' ? defined : 'web'
}

const iOS: Readonly<OneIOS> = Object.freeze({
  ...Swift,
  Widgets,
  LiveActivities,
  WidgetUI,
  LocalAuthentication,
  Location,
  Color: Color.ios,
  MenuAction,
  SplitView,
  ToolbarHost,
  BarButtonItem: ToolbarItem,
  ZoomTransitionAlignmentRectDetector,
  ZoomTransitionEnabler,
  ZoomTransitionSource,
})

const Android: Readonly<OneAndroid> = Object.freeze({
  ...Compose,
  Color: Color.android,
  Menu: NativeMenu,
  ContextMenu: NativeContextMenu,
})

const SafeArea: Readonly<OneSafeArea> = Object.freeze({
  Provider: SafeAreaProvider,
  View: SafeAreaView,
  initialMetrics: initialWindowMetrics,
})

const UI: Readonly<OneUI> = Object.freeze({
  ...NativeUI,
  Fonts,
  SafeArea,
  TextInput,
  ReservedRegions,
})

export const One: OneAPI = Object.freeze({
  get platform(): OnePlatform {
    return currentPlatform()
  },
  AppInfo,
  Database,
  iOS,
  Android,
  UI,
  Notifications,
  Clipboard: NativeClipboard,
  Haptics,
  Network: NativeNetwork,
  Auth,
  Browser: NativeBrowser,
  ImagePicker,
  DocumentPicker,
  SecureStore: NativeSecureStore,
  Speech: NativeSpeech,
  Updates: NativeUpdates,
  useFonts,
  useNativeState,
  useNetworkState,
  useSafeAreaFrame,
  useSafeAreaInsets,
  useSizeClass,
  getSizeClass,
  useHinge,
  getHinge,
  onHingeChange,
  useReservedRegions,
  useReservedRegionsReady,
  useWindowSegments,
  useSpanning,
})
