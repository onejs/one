import { Platform } from 'react-native'
import { Swift as UnsupportedSwift } from './unsupported'
import {
  Form,
  Glass,
  HStack,
  Host,
  LabeledContent,
  Section,
  Slot,
  Spacer,
  VStack,
  ZStack,
} from './Containers.native'
import { ContextMenu, Menu } from './Menu.native'
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
        Spacer,
        Slot,
        ...Controls,
      }
    : UnsupportedSwift
export { Compose }
export type * from './types'
export type * from './composeTypes'
