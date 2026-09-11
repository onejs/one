import { Platform } from 'react-native'
import { Swift as UnsupportedSwift } from './unsupported'
import { Menu } from './Menu.native'
import { Tab, Tabs } from './Tabs.native'

export const Swift = Platform.OS === 'ios' ? { Tabs, Tab, Menu } : UnsupportedSwift
export type * from './types'
