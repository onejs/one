// public One namespaces. platform-specific entries keep the names and prop
// contracts of their native frameworks; shared components live under UI.

import {
  Browser as NativeBrowser,
  Widgets,
  LiveActivities,
  WidgetUI,
  Clipboard as NativeClipboard,
  AppInfo,
  Color,
  Database,
  Compose,
  Fonts,
  Haptics,
  ImagePicker,
  MenuAction,
  Menu as NativeMenu,
  ContextMenu as NativeContextMenu,
  Network as NativeNetwork,
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
  useSizeClass,
  ZoomTransitionAlignmentRectDetector,
  ZoomTransitionEnabler,
  ZoomTransitionSource,
  type ColorType,
  useFonts,
  useNativeState,
  useNetworkState,
} from '@vxrn/native'
import {
  SafeAreaProvider,
  SafeAreaView,
  initialWindowMetrics,
  useSafeAreaFrame,
  useSafeAreaInsets,
} from '@vxrn/safe-area'

export type OnePlatform = 'web' | 'ios' | 'android' | 'rnx'

export type OneIOS = Omit<typeof Swift, 'ToolbarItem'> & {
  readonly Widgets: typeof Widgets
  readonly LiveActivities: typeof LiveActivities
  readonly WidgetUI: typeof WidgetUI
  readonly Color: ColorType['ios']
  readonly MenuAction: typeof MenuAction
  readonly SplitView: typeof SplitView
  readonly ToolbarHost: typeof ToolbarHost
  // One.iOS.ToolbarItem is the navigation toolbar item, as it always was. the SwiftUI
  // toolbar item is Swift.ToolbarItem, which is where the SwiftUI toolbar lives.
  readonly ToolbarItem: typeof ToolbarItem
  readonly ZoomTransitionAlignmentRectDetector: typeof ZoomTransitionAlignmentRectDetector
  readonly ZoomTransitionEnabler: typeof ZoomTransitionEnabler
  readonly ZoomTransitionSource: typeof ZoomTransitionSource
}

export type OneAndroid = typeof Compose & {
  readonly Menu: typeof NativeMenu
  readonly ContextMenu: typeof NativeContextMenu
}

export type OneSafeArea = {
  readonly Provider: typeof SafeAreaProvider
  readonly View: typeof SafeAreaView
  readonly initialMetrics: typeof initialWindowMetrics
  readonly useFrame: typeof useSafeAreaFrame
  readonly useInsets: typeof useSafeAreaInsets
}

export type OneUI = typeof NativeUI & {
  readonly Fonts: typeof Fonts
  readonly SafeArea: Readonly<OneSafeArea>
  readonly Haptics: typeof Haptics
  readonly TextInput: typeof TextInput
  readonly useFonts: typeof useFonts
  readonly useNativeState: typeof useNativeState
  // the window scene's size classes and the hinge, plus the regions reserved
  // inside a provider view (a foldable's fold, a camera occlusion): what
  // adaptive layout reads.
  readonly useSizeClass: typeof useSizeClass
  readonly getSizeClass: typeof getSizeClass
  readonly useHinge: typeof useHinge
  readonly getHinge: typeof getHinge
  readonly onHingeChange: typeof onHingeChange
  readonly ReservedRegions: typeof ReservedRegions
}

export type OneAPI = {
  readonly platform: OnePlatform
  readonly AppInfo: typeof AppInfo
  readonly Database: typeof Database
  readonly iOS: Readonly<OneIOS>
  readonly Android: Readonly<OneAndroid>
  readonly UI: Readonly<OneUI>
  readonly Clipboard: typeof NativeClipboard
  readonly Network: typeof NativeNetwork
  readonly Browser: typeof NativeBrowser
  readonly ImagePicker: typeof ImagePicker
  readonly useNetworkState: typeof useNetworkState
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
  Color: Color.ios,
  MenuAction,
  SplitView,
  ToolbarHost,
  ToolbarItem,
  ZoomTransitionAlignmentRectDetector,
  ZoomTransitionEnabler,
  ZoomTransitionSource,
})

const Android: Readonly<OneAndroid> = Object.freeze({
  ...Compose,
  Menu: NativeMenu,
  ContextMenu: NativeContextMenu,
})

const SafeArea: Readonly<OneSafeArea> = Object.freeze({
  Provider: SafeAreaProvider,
  View: SafeAreaView,
  initialMetrics: initialWindowMetrics,
  useFrame: useSafeAreaFrame,
  useInsets: useSafeAreaInsets,
})

const UI: Readonly<OneUI> = Object.freeze({
  ...NativeUI,
  Fonts,
  SafeArea,
  Haptics,
  TextInput,
  useFonts,
  useNativeState,
  useSizeClass,
  getSizeClass,
  useHinge,
  getHinge,
  onHingeChange,
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
  Clipboard: NativeClipboard,
  Network: NativeNetwork,
  Browser: NativeBrowser,
  ImagePicker,
  useNetworkState,
})
