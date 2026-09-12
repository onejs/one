import { unsupportedControls } from './generated/unsupportedControls'
import type {
  ContextMenuProps,
  FormProps,
  FullScreenCoverProps,
  HostProps,
  MenuProps,
  PopoverProps,
  SectionProps,
  SheetProps,
  SlotProps,
  TabProps,
  TabsProps,
} from './types'

function Tabs(_props: TabsProps): never {
  throw new Error('Swift.Tabs requires an iOS native build with one-native installed')
}
function Tab(_props: TabProps): never {
  throw new Error('Swift.Tab requires an iOS native build with one-native installed')
}
function Menu(_props: MenuProps): never {
  throw new Error('Swift.Menu requires an iOS native build with one-native installed')
}
function ContextMenu(_props: ContextMenuProps): never {
  throw new Error(
    'Swift.ContextMenu requires an iOS native build with one-native installed'
  )
}
function Sheet(_props: SheetProps): never {
  throw new Error('Swift.Sheet requires an iOS native build with one-native installed')
}
function FullScreenCover(_props: FullScreenCoverProps): never {
  throw new Error(
    'Swift.FullScreenCover requires an iOS native build with one-native installed'
  )
}
function Popover(_props: PopoverProps): never {
  throw new Error('Swift.Popover requires an iOS native build with one-native installed')
}
function Host(_props: HostProps): never {
  throw new Error('Swift.Host requires an iOS native build with one-native installed')
}
function Form(_props: FormProps): never {
  throw new Error('Swift.Form requires an iOS native build with one-native installed')
}
function Section(_props: SectionProps): never {
  throw new Error('Swift.Section requires an iOS native build with one-native installed')
}
function Slot(_props: SlotProps): never {
  throw new Error('Swift.Slot requires an iOS native build with one-native installed')
}
export const Swift = {
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
  ...unsupportedControls,
}
export type * from './types'
