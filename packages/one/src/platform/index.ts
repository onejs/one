import * as UI from './effects'
import { Swift } from './unsupported'
import { Widgets, LiveActivities, WidgetUI } from './widgets/index'

export * from './extras'
// the package root keeps the navigation toolbar's props under the plain name; the SwiftUI
// toolbar item's props are the generated ToolbarItemProps, reachable through Swift.ToolbarItem.
export type { ToolbarHostProps, ToolbarItemProps } from './extras'
export * from './unsupported'
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
} from './adaptive/index'
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
export const Menu = Swift.Menu
export const ContextMenu = Swift.ContextMenu
export { Compose } from './compose'
export { Notifications } from './notifications'
export { Widgets, LiveActivities, WidgetUI }
export { useNativeState, type NativeState } from './nativeState'
export { TextInput } from './universal/TextInput/index'
export type {
  TextInputProps,
  TextInputRef,
  TextInputSelection,
} from './universal/TextInput/textInputTypes'
export type * from './composeTypes'
export type * from './types'
export { Haptics } from './haptics/index'
export { LaunchScreen } from './launchScreen/index'
export { LocalAuthentication } from './local-authentication/index'
export type { LocalAuthenticationStatus } from './local-authentication/index'
export { ProtectedStore } from './protected-store/index'
export type { ProtectedStorePolicy } from './protected-store/index'
export { Location } from './location/index'
export type { LocationPermissionStatus, LocationPosition, LocationPlace, LocationWatchError } from './location/index'
export { FileSystem } from './file-system/index'
export type { FileDirectories, FileEncoding, FileEntry, FileInfo } from './file-system/index'
export { Audio } from './audio/index'
export { CameraView } from './camera/index'
export type {
  CameraCode, CameraCodeType, CameraFacing, CameraState, CameraViewProps,
} from './camera/index'
export type {
  AudioPlaybackState,
  AudioPlaybackStatus,
  AudioRecordingPermission,
  AudioRecordingResult,
  AudioRecordingState,
  AudioRecordingStatus,
} from './audio/index'
export { Share } from './share/index'
export { Open } from './open/index'
export type { OpenShareContent } from './open/index'
export type { ShareItem, ShareItemType, ShareResult } from './share/index'
export { PhotoLibrary } from './photo-library/index'
export { MapServices } from './map-services/index'
export type { MapCoordinate, MapPlace, MapRoute, MapRouteStep, MapTransport } from './map-services/index'
export type {
  PhotoLibraryAsset, PhotoLibraryAssetPage, PhotoLibraryMediaType, PhotoLibraryPermissionStatus,
} from './photo-library/index'
export { AppTracking } from './app-tracking/index'
export type { AppTrackingPermissionStatus } from './app-tracking/index'
export { ImageManipulator } from './image-manipulator/index'
export type { ImageCrop, ImageFormat, ImageResize, ImageManipulatorOptions, ImageTransformResult } from './image-manipulator/index'
export { Device } from './device/index'
export type { DeviceInfo, LocalizationInfo } from './device/index'
export { Contacts } from './contacts/index'
export type { ContactChanges, ContactInfo, ContactInput, ContactPostalAddress, ContactPostalAddressInput, ContactsPermissionStatus } from './contacts/index'
export { Calendar } from './calendar/index'
export type {
  CalendarEvent,
  CalendarEventChanges,
  CalendarEventInput,
  CalendarPermissionStatus,
  ReminderInfo,
  ReminderInput,
} from './calendar/index'
export type { HapticImpact, HapticNotification, HapticsApi } from './haptics/index'
export type { LaunchScreenApi, LaunchScreenHideOptions } from './launchScreen/index'
export { AppInfo } from './app-info/index'
export type { AppInfoApi } from './app-info/index'
export { ImagePicker } from './image-picker/index'
export { DocumentPicker } from './document-picker/index'
export { Database } from './database/index'
export type {
  ImagePickerAsset,
  ImagePickerCanceledResult,
  ImagePickerMediaType,
  ImagePickerOptions,
  ImagePickerPermissionResponse,
  ImagePickerResult,
  ImagePickerSuccessResult,
} from './image-picker/index'
export type {
  DocumentPickerAsset,
  DocumentPickerCanceledResult,
  DocumentPickerOptions,
  DocumentPickerResult,
  DocumentPickerSuccessResult,
} from './document-picker/index'
// web subset of the UI namespace (pure curve math, types, throwing
// component stubs). mirrors index.native.ts; see effects/index.ts.
export { UI }
