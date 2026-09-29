import { Platform } from 'react-native'
import { Swift as UnsupportedSwift } from './unsupported'
import {
  Button,
  ControlGroup,
  DisclosureGroup,
  Divider,
  Form,
  Glass,
  GlassEffectContainer,
  Group,
  GroupBox,
  ViewThatFits,
  HStack,
  Host,
  LabeledContent,
  LazyHStack,
  LazyVStack,
  LazyHGrid,
  LazyVGrid,
  Grid,
  GridRow,
  Link,
  List,
  Overlay,
  ViewSlot,
  ScrollView,
  Section,
  Slot,
  Spacer,
  SwipeActions,
  VStack,
  ZStack,
} from './Containers.native'
import { ContextMenu as AndroidContextMenu, Menu as AndroidMenu } from './AndroidMenu'
import { ContextMenu as IOSContextMenu, Menu as IOSMenu } from './Menu.native'
import { Page, Pager } from './Pager.native'
import { Popover } from './Popover.native'
import {
  NavigationStack,
  Toolbar,
  ToolbarItem,
  ToolbarItemGroup,
  ToolbarSpacer,
} from './NavigationStack.native'
import { FullScreenCover, Sheet } from './Sheet.native'
import { ArrangementView } from './ArrangementView.native'
import * as Controls from './generated/Controls.native'
import { Tab, Tabs, TabSection, TabViewBottomAccessory, TabViewSlot } from './Tabs.native'
import { Compose } from './compose'
import * as UI from './effects'
import { Widgets, LiveActivities, WidgetUI } from './widgets/index.native'

export * from './extras'
export { Preferences } from './preferences/index.native'
export { KeepAwake } from './keep-awake/index.native'
export { Print } from './print/index.native'
export { StoreReview } from './store-review/index.native'
export { QuickActions } from './quick-actions/index.native'
export type { QuickActionItem } from './quick-actions/index.native'
export type { PrintResult } from './print/index.native'
// the package root keeps the navigation toolbar's props under the plain name; the SwiftUI
// toolbar item's props are the generated ToolbarItemProps, reachable through Swift.ToolbarItem.
export type { ToolbarHostProps, ToolbarItemProps } from './extras'
export {
  useSizeClass,
  getSizeClass,
  useHinge,
  getHinge,
  onHingeChange,
  ReservedRegions,
  useReservedRegions,
  useReservedRegionsReady,
  useWindowSegments,
  useSpanning,
} from './adaptive/index.native'
export type {
  UserInterfaceSizeClass,
  SizeClass,
  HingeStatus,
  HingeState,
  ReservedRegionKind,
  ReservedRegion,
  WindowSegment,
  ReservedRegionOptions,
  ReservedRegionsProviderProps,
} from './adaptive/types'
export type {
  ArrangementViewProps,
  ArrangementPaneProps,
  ArrangementViewStyle,
  SplitLayoutRatio,
  SplitLayoutSize,
  SplitFixedLayoutSize,
  OverlayArrangementEdge,
} from './ArrangementView.native'

const Menu = Platform.OS === 'android' ? AndroidMenu : IOSMenu
const ContextMenu = Platform.OS === 'android' ? AndroidContextMenu : IOSContextMenu

export const Swift =
  Platform.OS === 'ios'
    ? {
        ArrangementView,
        Tabs,
        Tab,
        TabSection,
        TabViewBottomAccessory,
        TabViewSlot,
        Menu,
        ContextMenu,
        Sheet,
        FullScreenCover,
        Popover,
        Host,
        HStack,
        VStack,
        ZStack,
        Form,
        Section,
        Glass,
        GlassEffectContainer,
        LabeledContent,
        Button,
        List,
        ScrollView,
        LazyVStack,
        LazyHStack,
        LazyVGrid,
        LazyHGrid,
        Grid,
        GridRow,
        ControlGroup,
        DisclosureGroup,
        Divider,
        Link,
        Group,
        GroupBox,
        ViewThatFits,
        Overlay,
        ViewSlot,
        SwipeActions,
        Pager,
        Page,
        NavigationStack,
        Toolbar,
        ToolbarItem,
        ToolbarItemGroup,
        ToolbarSpacer,
        Spacer,
        Slot,
        ...Controls,
      }
    : UnsupportedSwift
export { Compose }
export { Notifications } from './notifications'
export { Widgets, LiveActivities, WidgetUI }
export { Menu, ContextMenu }
export { useNativeState, type NativeState } from './nativeState'
export { TextInput } from './universal/TextInput/index'
export type {
  TextInputProps,
  TextInputRef,
  TextInputSelection,
} from './universal/TextInput/textInputTypes'
export type * from './types'
export type * from './composeTypes'
export { Haptics } from './haptics/index.native'
export { LaunchScreen } from './launchScreen/index.native'
export { LocalAuthentication } from './local-authentication/index.native'
export type { LocalAuthenticationStatus } from './local-authentication/index.native'
export { ProtectedStore } from './protected-store/index.native'
export type { ProtectedStorePolicy } from './protected-store/index.native'
export { Location } from './location/index.native'
export type { LocationPermissionStatus, LocationPosition, LocationPlace, LocationWatchError } from './location/index.native'
export { FileSystem } from './file-system/index.native'
export type { FileDirectories, FileEncoding, FileEntry, FileInfo } from './file-system/index.native'
export { Audio } from './audio/index.native'
export { CameraView } from './camera/index.native'
export type {
  CameraCode, CameraCodeType, CameraFacing, CameraState, CameraViewProps,
} from './camera/index.native'
export type {
  AudioPlaybackState,
  AudioPlaybackStatus,
  AudioRecordingPermission,
  AudioRecordingResult,
  AudioRecordingState,
  AudioRecordingStatus,
} from './audio/index.native'
export { Share } from './share/index.native'
export { Open } from './open/index.native'
export type { OpenShareContent } from './open/index.native'
export type { ShareItem, ShareItemType, ShareResult } from './share/index.native'
export { PhotoLibrary } from './photo-library/index.native'
export { MapServices } from './map-services/index.native'
export type { MapCoordinate, MapPlace, MapRoute, MapRouteStep, MapSuggestion, MapTransport } from './map-services/index.native'
export type {
  PhotoLibraryAsset, PhotoLibraryAssetPage, PhotoLibraryMediaType, PhotoLibraryPermissionStatus,
} from './photo-library/index.native'
export { AppTracking } from './app-tracking/index.native'
export { AppIcon } from './app-icon/index.native'
export type { AppTrackingPermissionStatus } from './app-tracking/index.native'
export { ScreenOrientation } from './screen-orientation/index.native'
export type { ScreenOrientationLock, ScreenOrientationValue } from './screen-orientation/index.native'
export { ScreenCapture } from './screen-capture/index.native'
export type { ScreenCaptureState } from './screen-capture/index.native'
export { Purchases } from './purchases/index.native'
export type {
  PurchaseProduct, PurchaseProductType, PurchaseResult, PurchaseStatus,
  PurchaseTransaction, PurchaseUpdate, PurchaseUpdateStatus,
} from './purchases/index.native'
export { ImageManipulator } from './image-manipulator/index.native'
export type { ImageCrop, ImageFormat, ImageResize, ImageManipulatorOptions, ImageTransformResult } from './image-manipulator/index.native'
export { Device } from './device/index.native'
export type { DeviceInfo, LocalizationInfo } from './device/index.native'
export { Motion } from './motion/index.native'
export type { MotionAvailability, MotionReading, MotionSensor, MotionVector } from './motion/index.native'
export { BackgroundTasks } from './background-tasks/index.native'
export type { BackgroundTaskContext, BackgroundTaskHandler } from './background-tasks/index.native'
export type { BackgroundTaskInvocation, BackgroundTaskKind, PendingBackgroundTask } from './background-tasks/index.native'
export { DeviceAttestation } from './device-attestation/index.native'
export type { DeviceAttestationAvailability } from './device-attestation/index.native'
export { Contacts } from './contacts/index.native'
export type { ContactChanges, ContactInfo, ContactInput, ContactPostalAddress, ContactPostalAddressInput, ContactsPermissionStatus } from './contacts/index.native'
export { Calendar } from './calendar/index.native'
export type {
  CalendarEvent,
  CalendarEventChanges,
  CalendarEventInput,
  CalendarPermissionStatus,
  ReminderInfo,
  ReminderInput,
} from './calendar/index.native'
export type { HapticImpact, HapticNotification, HapticsApi } from './haptics/index.native'
export type { LaunchScreenApi, LaunchScreenHideOptions } from './launchScreen/index.native'
export { AppInfo } from './app-info/index.native'
export type { AppInfoApi } from './app-info/index.native'
export { ImagePicker } from './image-picker/index.native'
export { DocumentPicker } from './document-picker/index.native'
export { Database } from './database/index.native'
export type {
  ImagePickerAsset,
  ImagePickerCanceledResult,
  ImagePickerMediaType,
  ImagePickerOptions,
  ImagePickerPermissionResponse,
  ImagePickerResult,
  ImagePickerSuccessResult,
} from './image-picker/index.native'
export type {
  DocumentPickerAsset,
  DocumentPickerCanceledResult,
  DocumentPickerOptions,
  DocumentPickerResult,
  DocumentPickerSuccessResult,
} from './document-picker/index.native'
// One.UI components live here physically: UI.EdgeFade, UI.Blur, UI.Mask.
// the One package re-exports this namespace as One.UI.
export { UI }
