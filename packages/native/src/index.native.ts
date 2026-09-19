import { Platform } from 'react-native'
import { Swift as UnsupportedSwift } from './unsupported'
import {
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
import { ContextMenu, Menu } from './Menu.native'
import { Page, Pager } from './Pager.native'
import { Popover } from './Popover.native'
import { FullScreenCover, Sheet } from './Sheet.native'
import * as Controls from './generated/Controls.native'
import { Tab, Tabs } from './Tabs.native'
import { Compose } from './compose'

export * from './extras'

export const Swift =
  Platform.OS === 'ios'
    ? {
        Tabs,
        Tab,
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
export { useNativeState, type NativeState } from './nativeState'
export type * from './types'
export type * from './composeTypes'
