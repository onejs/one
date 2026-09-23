import { unsupportedControls } from './generated/unsupportedControls'
import type {
  ButtonProps,
  ContextMenuProps,
  ControlGroupProps,
  DisclosureGroupProps,
  DividerProps,
  FormProps,
  FullScreenCoverProps,
  GlassProps,
  GroupProps,
  HostProps,
  LabeledContentProps,
  LazyHStackProps,
  LazyVStackProps,
  LinkProps,
  ListProps,
  MenuProps,
  OverlayContentProps,
  OverlayProps,
  PageProps,
  PagerProps,
  PopoverProps,
  ScrollViewProps,
  SectionProps,
  SheetProps,
  SlotProps,
  SpacerProps,
  StackProps,
  SwipeActionsActionsProps,
  SwipeActionsProps,
  TabProps,
  TabsProps,
  TabViewBottomAccessoryProps,
  ZStackProps,
} from './types'

function Tabs(_props: TabsProps): never {
  throw new Error('Swift.Tabs requires an iOS native build with @vxrn/native installed')
}
function Tab(_props: TabProps): never {
  throw new Error('Swift.Tab requires an iOS native build with @vxrn/native installed')
}
function TabViewBottomAccessory(_props: TabViewBottomAccessoryProps): never {
  throw new Error('Swift.TabViewBottomAccessory requires an iOS native build with @vxrn/native installed')
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
function Button(_props: ButtonProps): never {
  throw new Error('Swift.Button requires an iOS native build with @vxrn/native installed')
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
function ControlGroup(_props: ControlGroupProps): never {
  throw new Error(
    'Swift.ControlGroup requires an iOS native build with @vxrn/native installed'
  )
}
function DisclosureGroup(_props: DisclosureGroupProps): never {
  throw new Error(
    'Swift.DisclosureGroup requires an iOS native build with @vxrn/native installed'
  )
}
function Divider(_props: DividerProps): never {
  throw new Error('Swift.Divider requires an iOS native build with @vxrn/native installed')
}
function Link(_props: LinkProps): never {
  throw new Error('Swift.Link requires an iOS native build with @vxrn/native installed')
}
function Group(_props: GroupProps): never {
  throw new Error('Swift.Group requires an iOS native build with @vxrn/native installed')
}
function OverlayContent(_props: OverlayContentProps): never {
  throw new Error(
    'Swift.Overlay.Content requires an iOS native build with @vxrn/native installed'
  )
}
function OverlayFn(_props: OverlayProps): never {
  throw new Error('Swift.Overlay requires an iOS native build with @vxrn/native installed')
}
const Overlay = Object.assign(OverlayFn, { Content: OverlayContent })
function SwipeActionsActions(_props: SwipeActionsActionsProps): never {
  throw new Error(
    'Swift.SwipeActions.Actions requires an iOS native build with @vxrn/native installed'
  )
}
function SwipeActionsFn(_props: SwipeActionsProps): never {
  throw new Error(
    'Swift.SwipeActions requires an iOS native build with @vxrn/native installed'
  )
}
const SwipeActions = Object.assign(SwipeActionsFn, { Actions: SwipeActionsActions })
function Page(_props: PageProps): never {
  throw new Error('Swift.Page requires an iOS native build with @vxrn/native installed')
}
function Pager(_props: PagerProps): never {
  throw new Error('Swift.Pager requires an iOS native build with @vxrn/native installed')
}
export const Swift = {
  Tabs,
  Tab,
  TabViewBottomAccessory,
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
  Button,
  Spacer,
  Slot,
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
  ...unsupportedControls,
}
export type * from './types'
