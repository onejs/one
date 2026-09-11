import { Platform } from 'react-native'
import { Swift as UnsupportedSwift } from './unsupported'
import { Menu } from './Menu.native'
import { Sheet } from './Sheet.native'
import * as Controls from './generated/Controls.native'
import { Tab, Tabs } from './Tabs.native'

export const Swift =
  Platform.OS === 'ios' ? { Tabs, Tab, Menu, Sheet, ...Controls } : UnsupportedSwift
export type * from './types'
