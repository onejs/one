import * as UI from './effects'
import { Swift } from './unsupported'

export * from './extras'
// the package root keeps the navigation toolbar's props under the plain name; the SwiftUI
// toolbar item's props are the generated ToolbarItemProps, reachable through Swift.ToolbarItem.
export type { ToolbarHostProps, ToolbarItemProps } from './extras'
export * from './unsupported'
export const Menu = Swift.Menu
export const ContextMenu = Swift.ContextMenu
export { Compose } from './compose'
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
// web subset of the UI namespace (pure curve math, types, throwing
// component stubs). mirrors index.native.ts; see effects/index.ts.
export { UI }
