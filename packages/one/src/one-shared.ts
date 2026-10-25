// public One namespaces. platform-specific entries keep the names and prop
// contracts of their native frameworks; shared components live under UI.

import {
  Auth,
  Browser as NativeBrowser,
  Widgets,
  LiveActivities,
  LocalAuthentication,
  ProtectedStore,
  KeepAwake,
  Print,
  StoreReview,
  QuickActions,
  Location,
  FileSystem,
  Audio,
  CameraView,
  Share,
  Open,
  PhotoLibrary,
  MapServices,
  AppTracking,
  AppIcon,
  ScreenOrientation,
  ScreenCapture,
  Purchases,
  ImageManipulator,
  Device,
  Crypto as NativeCrypto,
  Localization,
  Motion,
  BackgroundTasks,
  AppIntents,
  DeviceAttestation,
  Contacts,
  Calendar,
  WidgetUI,
  VNDocumentCameraViewController,
  DataScannerViewController,
  CNContactViewController,
  CNMutableContact,
  CNContactStore,
  MFMailComposeViewController,
  MFMessageComposeViewController,
  Clipboard as NativeClipboard,
  Barometer as NativeBarometer,
  LightSensor as NativeLightSensor,
  Pedometer as NativePedometer,
  Battery as NativeBattery,
  Brightness as NativeBrightness,
  SpeechSynthesis as NativeSpeechSynthesis,
  AppInfo,
  Color,
  Database,
  Compose,
  Fonts,
  DocumentPicker,
  Haptics,
  ImagePicker,
  LaunchScreen,
  MenuAction,
  Menu as NativeMenu,
  ContextMenu as NativeContextMenu,
  Notifications,
  Network as NativeNetwork,
  SecureStore as NativeSecureStore,
  Storage,
  Speech as NativeSpeech,
  Updates as NativeUpdates,
  SplitView,
  Swift,
  TextInput,
  ToolbarHost,
  ToolbarItem,
  UI as NativeUI,
  ReservedRegions,
  ZoomTransitionAlignmentRectDetector,
  ZoomTransitionEnabler,
  ZoomTransitionSource,
  type ColorType,
} from './platform'
import type { ComponentType } from 'react'
import type { OneMacAppCommands } from './platform/mac/AppCommands.macos'
import type { ImageProps as MacImageProps } from './platform/mac/Image.macos'
import type { ButtonProps } from './platform/mac/Button.macos'
import type { SegmentedControlProps } from './platform/mac/SegmentedControl.macos'
import type { ToggleProps } from './platform/mac/Toggle.macos'
import type { SwitchProps } from './platform/linux/Switch.linux'
import type { ButtonProps as LinuxButtonProps } from './platform/linux/Button.linux'
import type { SegmentedControlProps as LinuxSegmentedControlProps } from './platform/linux/SegmentedControl.linux'
import type { SliderProps as LinuxSliderProps } from './platform/linux/Slider.linux'
import type { DropDownProps } from './platform/linux/DropDown.linux'
import type { ProgressBarProps } from './platform/linux/ProgressBar.linux'
import type { ToggleProps as LinuxToggleProps } from './platform/linux/Toggle.linux'
import type { StepperProps as LinuxStepperProps } from './platform/linux/Stepper.linux'
import type { TextFieldProps as LinuxTextFieldProps } from './platform/linux/TextField.linux'
import type { SecureFieldProps as LinuxSecureFieldProps } from './platform/linux/SecureField.linux'
import { SafeAreaProvider, SafeAreaView, initialWindowMetrics } from './safe-area-context'

export type OnePlatform = 'web' | 'ios' | 'android' | 'macos' | 'linux'

export type OneMacOS = {
  readonly Image: ComponentType<MacImageProps>
  readonly Toggle: ComponentType<ToggleProps>
  readonly Button: ComponentType<ButtonProps>
  readonly SegmentedControl: ComponentType<SegmentedControlProps>
  readonly AppCommands: OneMacAppCommands
}

export type OneLinux = {
  readonly Switch: ComponentType<SwitchProps>
  readonly Button: ComponentType<LinuxButtonProps>
  readonly SegmentedControl: ComponentType<LinuxSegmentedControlProps>
  readonly Slider: ComponentType<LinuxSliderProps>
  readonly DropDown: ComponentType<DropDownProps>
  readonly ProgressBar: ComponentType<ProgressBarProps>
  readonly Toggle: ComponentType<LinuxToggleProps>
  readonly Stepper: ComponentType<LinuxStepperProps>
  readonly TextField: ComponentType<LinuxTextFieldProps>
  readonly SecureField: ComponentType<LinuxSecureFieldProps>
}

export type OneIOS = typeof Swift & {
  readonly MFMailComposeViewController: typeof MFMailComposeViewController
  readonly MFMessageComposeViewController: typeof MFMessageComposeViewController
  readonly CNContactViewController: typeof CNContactViewController
  readonly CNMutableContact: typeof CNMutableContact
  readonly CNContactStore: typeof CNContactStore
  readonly DataScannerViewController: typeof DataScannerViewController
  readonly VNDocumentCameraViewController: typeof VNDocumentCameraViewController
  readonly WidgetUI: typeof WidgetUI
  readonly CameraView: typeof CameraView
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
  readonly CameraView: typeof CameraView
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
  // a url goes to the os (a new tab on web), content to the system share
  // sheet, and the app's settings page opens on native.
  readonly openURL: typeof Open.openURL
  readonly openShare: typeof Open.openShare
  readonly openSettings: typeof Open.openSettings
  readonly AppInfo: typeof AppInfo
  readonly Database: typeof Database
  readonly Widgets: typeof Widgets
  readonly LiveActivities: typeof LiveActivities
  readonly LocalAuthentication: typeof LocalAuthentication
  readonly ProtectedStore: typeof ProtectedStore
  readonly KeepAwake: typeof KeepAwake
  readonly Print: typeof Print
  readonly StoreReview: typeof StoreReview
  readonly QuickActions: typeof QuickActions
  readonly Location: typeof Location
  readonly FileSystem: typeof FileSystem
  readonly Audio: typeof Audio
  readonly Share: typeof Share
  readonly PhotoLibrary: typeof PhotoLibrary
  readonly MapServices: typeof MapServices
  readonly AppTracking: typeof AppTracking
  readonly AppIcon: typeof AppIcon
  readonly ScreenOrientation: typeof ScreenOrientation
  readonly ScreenCapture: typeof ScreenCapture
  readonly Purchases: typeof Purchases
  readonly ImageManipulator: typeof ImageManipulator
  readonly Device: typeof Device
  readonly Crypto: typeof NativeCrypto
  readonly Localization: typeof Localization
  readonly Motion: typeof Motion
  readonly BackgroundTasks: typeof BackgroundTasks
  readonly AppIntents: typeof AppIntents
  readonly DeviceAttestation: typeof DeviceAttestation
  readonly Contacts: typeof Contacts
  readonly Calendar: typeof Calendar
  readonly iOS: Readonly<OneIOS>
  // present on the macos entry only, so ios, android and web bundles omit it
  readonly macOS?: Readonly<OneMacOS>
  // present on the linux entry only, for the same reason
  readonly linux?: Readonly<OneLinux>
  readonly Android: Readonly<OneAndroid>
  readonly UI: Readonly<OneUI>
  readonly Notifications: Readonly<OneNotifications>
  readonly Clipboard: typeof NativeClipboard
  readonly Barometer: typeof NativeBarometer
  readonly LightSensor: typeof NativeLightSensor
  readonly Pedometer: typeof NativePedometer
  readonly Battery: typeof NativeBattery
  readonly Brightness: typeof NativeBrightness
  readonly SpeechSynthesis: typeof NativeSpeechSynthesis
  readonly Haptics: typeof Haptics
  readonly LaunchScreen: typeof LaunchScreen
  readonly Network: typeof NativeNetwork
  readonly Auth: typeof Auth
  readonly Browser: typeof NativeBrowser
  readonly ImagePicker: typeof ImagePicker
  readonly DocumentPicker: typeof DocumentPicker
  readonly SecureStore: typeof NativeSecureStore
  readonly Storage: typeof Storage
  readonly Speech: typeof NativeSpeech
  readonly Updates: typeof NativeUpdates
}

// the One object of the macos entry, which always has its native namespace
export type OneMacAPI = OneAPI & {
  readonly platform: 'macos'
  readonly macOS: Readonly<OneMacOS>
}

// the One object of the linux entry, which always has its native namespace
export type OneLinuxAPI = OneAPI & {
  readonly platform: 'linux'
  readonly linux: Readonly<OneLinux>
}

function currentPlatform(): OnePlatform {
  const defined =
    Reflect.get(globalThis, '__ONE_PLATFORM__') ??
    (typeof process !== 'undefined' ? process.env.ONE_PLATFORM : undefined)
  return defined === 'ios' || defined === 'android' ? defined : 'web'
}

const iOS: Readonly<OneIOS> = Object.freeze({
  ...Swift,
  VNDocumentCameraViewController,
  DataScannerViewController,
  CNContactViewController,
  CNMutableContact,
  CNContactStore,
  MFMailComposeViewController,
  MFMessageComposeViewController,
  WidgetUI,
  CameraView,
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
  CameraView,
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
  openURL: Open.openURL,
  openShare: Open.openShare,
  openSettings: Open.openSettings,
  AppInfo,
  Database,
  Widgets,
  LiveActivities,
  LocalAuthentication,
  ProtectedStore,
  KeepAwake,
  Print,
  StoreReview,
  QuickActions,
  Location,
  FileSystem,
  Audio,
  Share,
  PhotoLibrary,
  MapServices,
  AppTracking,
  AppIcon,
  ScreenOrientation,
  ScreenCapture,
  Purchases,
  ImageManipulator,
  Device,
  Crypto: NativeCrypto,
  Localization,
  Motion,
  BackgroundTasks,
  AppIntents,
  DeviceAttestation,
  Contacts,
  Calendar,
  iOS,
  Android,
  UI,
  Notifications,
  Clipboard: NativeClipboard,
  Barometer: NativeBarometer,
  LightSensor: NativeLightSensor,
  Pedometer: NativePedometer,
  Battery: NativeBattery,
  Brightness: NativeBrightness,
  SpeechSynthesis: NativeSpeechSynthesis,
  Haptics,
  LaunchScreen,
  Network: NativeNetwork,
  Auth,
  Browser: NativeBrowser,
  ImagePicker,
  DocumentPicker,
  SecureStore: NativeSecureStore,
  Storage,
  Speech: NativeSpeech,
  Updates: NativeUpdates,
})
