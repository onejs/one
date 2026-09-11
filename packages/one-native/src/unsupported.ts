import { unsupportedControls } from './generated/unsupportedControls'
import type { MenuProps, TabProps, TabsProps, SheetProps } from './types'

function Tabs(_props: TabsProps): never {
  throw new Error('Swift.Tabs requires an iOS native build with one-native installed')
}
function Tab(_props: TabProps): never {
  throw new Error('Swift.Tab requires an iOS native build with one-native installed')
}
function Menu(_props: MenuProps): never {
  throw new Error('Swift.Menu requires an iOS native build with one-native installed')
}
function Sheet(_props: SheetProps): never {
  throw new Error('Swift.Sheet requires an iOS native build with one-native installed')
}
export const Swift = { Tabs, Tab, Menu, Sheet, ...unsupportedControls }
export type * from './types'
