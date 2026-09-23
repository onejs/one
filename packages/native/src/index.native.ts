import { Platform } from 'react-native'
import { Swift as UnsupportedSwift } from './unsupported'
import {
  Button,
  ControlGroup,
  DisclosureGroup,
  Divider,
  Form,
  Glass,
  Group,
  HStack,
  Host,
  LabeledContent,
  LazyHStack,
  LazyVStack,
  Link,
  List,
  Overlay,
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
import { FullScreenCover, Sheet } from './Sheet.native'
import * as Controls from './generated/Controls.native'
import { Tab, Tabs, TabSection, TabViewBottomAccessory, TabViewSlot } from './Tabs.native'
import { Compose } from './compose'
import * as UI from './effects'

export * from './extras'

const Menu = Platform.OS === 'android' ? AndroidMenu : IOSMenu
const ContextMenu = Platform.OS === 'android' ? AndroidContextMenu : IOSContextMenu

export const Swift =
  Platform.OS === 'ios'
    ? {
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
        LabeledContent,
        Button,
        List,
        ScrollView,
        LazyVStack,
        LazyHStack,
        ControlGroup,
        DisclosureGroup,
        Divider,
        Link,
        Group,
        Overlay,
        SwipeActions,
        Pager,
        Page,
        Spacer,
        Slot,
        ...Controls,
      }
    : UnsupportedSwift
export { Compose }
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
export type { HapticImpact, HapticNotification, HapticsApi } from './haptics/index.native'
export { AppInfo } from './app-info/index.native'
export type { AppInfoApi } from './app-info/index.native'
export { ImagePicker } from './image-picker/index.native'
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
// One.UI components live here physically: UI.EdgeFade, UI.Blur, UI.Mask.
// the One package re-exports this namespace as One.UI.
export { UI }
