// @vxrn/native provides UIKit and Android capabilities outside React Navigation.
// adapted from expo-router (MIT license): https://github.com/expo/expo

export { Color } from './color'
export type { ColorType } from './color'

export {
  ZoomTransitionSource,
  ZoomTransitionEnabler,
  ZoomTransitionAlignmentRectDetector,
} from './zoom'

export { ToolbarHost, ToolbarItem } from './toolbar'
export type { ToolbarHostProps, ToolbarItemProps } from './toolbar'

// './menu/index', not './menu': Menu.native.tsx (the SwiftUI Menu) shadows
// the menu/ directory for case-insensitive resolvers, which leaves
// MenuAction undefined at runtime.
export { MenuAction } from './menu/index'
export type { MenuActionProps } from './menu/index'

export { SplitView } from './split-view'
export type { SplitViewProps, SplitViewColumnProps } from './split-view'

// small uniform device apis matching their expo module shapes, so migration
// is a mechanical import swap. surfaced top-level on One, never under One.UI.
export * as Clipboard from './clipboard'
export * as Network from './network'
