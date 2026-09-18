import { unsupportedControls } from './generated/unsupportedControls'
import type {
  ContextMenuProps,
  FormProps,
  FullScreenCoverProps,
  GlassProps,
  HostProps,
  LabeledContentProps,
  LazyHStackProps,
  LazyVStackProps,
  ListProps,
  MenuProps,
  PopoverProps,
  ScrollViewProps,
  SectionProps,
  SheetProps,
  SlotProps,
  SpacerProps,
  StackProps,
  TabProps,
  TabsProps,
  ZStackProps,
} from './types'

function Tabs(_props: TabsProps): never {
  throw new Error('Swift.Tabs requires an iOS native build with @vxrn/native installed')
}
function Tab(_props: TabProps): never {
  throw new Error('Swift.Tab requires an iOS native build with @vxrn/native installed')
}
function Menu(_props: MenuProps): never {
  throw new Error('Swift.Menu requires an iOS native build with @vxrn/native installed')
}
function ContextMenu(_props: ContextMenuProps): never {
  throw new Error(
    'Swift.ContextMenu requires an iOS native build with @vxrn/native installed'
  )
}
function Sheet(_props: SheetProps): never {
  throw new Error('Swift.Sheet requires an iOS native build with @vxrn/native installed')
}
function FullScreenCover(_props: FullScreenCoverProps): never {
  throw new Error(
    'Swift.FullScreenCover requires an iOS native build with @vxrn/native installed'
  )
}
function Popover(_props: PopoverProps): never {
  throw new Error('Swift.Popover requires an iOS native build with @vxrn/native installed')
}
function Host(_props: HostProps): never {
  throw new Error('Swift.Host requires an iOS native build with @vxrn/native installed')
}
function HStack(_props: StackProps): never {
  throw new Error('Swift.HStack requires an iOS native build with @vxrn/native installed')
}
function VStack(_props: StackProps): never {
  throw new Error('Swift.VStack requires an iOS native build with @vxrn/native installed')
}
function ZStack(_props: ZStackProps): never {
  throw new Error('Swift.ZStack requires an iOS native build with @vxrn/native installed')
}
function Spacer(_props: SpacerProps): never {
  throw new Error('Swift.Spacer requires an iOS native build with @vxrn/native installed')
}
function Form(_props: FormProps): never {
  throw new Error('Swift.Form requires an iOS native build with @vxrn/native installed')
}
function Section(_props: SectionProps): never {
  throw new Error('Swift.Section requires an iOS native build with @vxrn/native installed')
}
function LabeledContent(_props: LabeledContentProps): never {
  throw new Error(
    'Swift.LabeledContent requires an iOS native build with @vxrn/native installed'
  )
}
function Glass(_props: GlassProps): never {
  throw new Error('Swift.Glass requires an iOS native build with @vxrn/native installed')
}
function Slot(_props: SlotProps): never {
  throw new Error('Swift.Slot requires an iOS native build with @vxrn/native installed')
}
function List(_props: ListProps): never {
  throw new Error('Swift.List requires an iOS native build with @vxrn/native installed')
}
function ScrollView(_props: ScrollViewProps): never {
  throw new Error(
    'Swift.ScrollView requires an iOS native build with @vxrn/native installed'
  )
}
function LazyVStack(_props: LazyVStackProps): never {
  throw new Error(
    'Swift.LazyVStack requires an iOS native build with @vxrn/native installed'
  )
}
function LazyHStack(_props: LazyHStackProps): never {
  throw new Error(
    'Swift.LazyHStack requires an iOS native build with @vxrn/native installed'
  )
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
  HStack,
  VStack,
  ZStack,
  Form,
  Section,
  Glass,
  LabeledContent,
  Spacer,
  Slot,
  List,
  ScrollView,
  LazyVStack,
  LazyHStack,
  ...unsupportedControls,
}
export type * from './types'
