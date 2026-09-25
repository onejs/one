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
} from './adaptive/index'
export type {
  UserInterfaceSizeClass,
  SizeClass,
  HingeStatus,
  HingeState,
  ReservedRegionKind,
  ReservedRegion,
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
export type { HapticImpact, HapticNotification, HapticsApi } from './haptics/index'
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
