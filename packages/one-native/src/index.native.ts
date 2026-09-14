import { Platform } from 'react-native'
import { Swift as UnsupportedSwift } from './unsupported'
import {
  Form,
  HStack,
  Host,
  Section,
  Slot,
  Spacer,
  VStack,
  ZStack,
} from './Containers.native'
import { Menu } from './Menu.native'
import { Popover } from './Popover.native'
import { Sheet } from './Sheet.native'
import * as Controls from './generated/Controls.native'
import { Tab, Tabs } from './Tabs.native'

export const Swift =
  Platform.OS === 'ios'
    ? {
        Tabs,
        Tab,
        Menu,
        Sheet,
        Popover,
        Host,
        HStack,
        VStack,
        ZStack,
        Form,
        Section,
        Spacer,
        Slot,
        ...Controls,
      }
    : UnsupportedSwift
export type * from './types'
