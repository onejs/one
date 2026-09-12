import { Platform } from 'react-native'
import { Swift as UnsupportedSwift } from './unsupported'
import { Form, Host, Section, Slot } from './Containers.native'
import { ContextMenu, Menu } from './Menu.native'
import { Popover } from './Popover.native'
import { FullScreenCover, Sheet } from './Sheet.native'
import * as Controls from './generated/Controls.native'
import { Tab, Tabs } from './Tabs.native'

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
        Form,
        Section,
        Slot,
        ...Controls,
      }
    : UnsupportedSwift
export type * from './types'
