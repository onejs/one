import type { MenuProps, TabProps, TabsProps } from './types'

function Tabs(_props: TabsProps): never {
  throw new Error('Swift.Tabs requires an iOS native build with one-native installed')
}
function Tab(_props: TabProps): never {
  throw new Error('Swift.Tab requires an iOS native build with one-native installed')
}
function Menu(_props: MenuProps): never {
  throw new Error('Swift.Menu requires an iOS native build with one-native installed')
}

export const Swift = { Tabs, Tab, Menu }
export type * from './types'
