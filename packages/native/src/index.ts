// @vxrn/native - One native extras that React Navigation v8 / screens do not own.
// keep: zoom transitions, bottom ToolbarHost, MenuAction, SplitView, Color,
// and StackToolbar mapping onto native-stack headerLeft/Right items.
// native tabs and default stack headers live in `one` + @react-navigation.
// adapted from expo-router (MIT license) - https://github.com/expo/expo

import { registerNativeStackToolbar } from './StackToolbarImplementation'

registerNativeStackToolbar()

export { Color } from './color'
export type { ColorType } from './color'

export {
  ZoomTransitionSource,
  ZoomTransitionEnabler,
  ZoomTransitionAlignmentRectDetector,
} from './zoom'

export { ToolbarHost, ToolbarItem } from './toolbar'
export type { ToolbarHostProps, ToolbarItemProps } from './toolbar'

export { MenuAction } from './menu'
export type { MenuActionProps } from './menu'

export { SplitView } from './split-view'
export type { SplitViewProps, SplitViewColumnProps } from './split-view'

export { StackToolbar } from './stack-toolbar/StackToolbar'
export type {
  StackToolbarBadgeProps,
  StackToolbarButtonProps,
  StackToolbarIconProps,
  StackToolbarLabelProps,
  StackToolbarMenuActionProps,
  StackToolbarMenuProps,
  StackToolbarPlacement,
  StackToolbarProps,
  StackToolbarSearchBarSlotProps,
  StackToolbarSpacerProps,
  StackToolbarViewProps,
} from './stack-toolbar/StackToolbar.types'
