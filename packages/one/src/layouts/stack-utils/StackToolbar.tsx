import { NAVIGATOR_CONFIG } from '../../headless/children'
import {
  TOOLBAR_KIND,
  type StackToolbarItemProps,
  type StackToolbarMenuProps,
  type StackToolbarProps,
  type StackToolbarSlotProps,
} from './stackToolbarDescriptors'

export type {
  BottomToolbarData,
  BottomToolbarItemData,
  BottomToolbarMenuData,
  StackToolbarBottomProps,
  StackToolbarItemProps,
  StackToolbarMenuProps,
  StackToolbarPlacement,
  StackToolbarProps,
  StackToolbarSlotProps,
} from './stackToolbarDescriptors'
export { appendStackToolbarPropsToOptions } from './stackToolbarDescriptors'

function mark<ComponentT extends (...args: never[]) => null>(component: ComponentT, kind: string) {
  return Object.assign(component, { [NAVIGATOR_CONFIG]: true, [TOOLBAR_KIND]: kind })
}

/**
 * Grouping container for toolbar slots. Use in Stack.Screen or stack-level
 * children, mirroring Stack.Header. Leading/trailing slots compile to native
 * header items; Bottom in layout config warns because the toolbar host must
 * mount inside screen content.
 */
export function StackToolbarComponent(_props: StackToolbarProps) {
  return null
}
mark(StackToolbarComponent, 'toolbar')

/**
 * Navigation-bar leading items. Primary direction-aware name; Left is the
 * One Header-convention alias.
 */
export function StackToolbarLeading(_props: StackToolbarSlotProps) {
  return null
}
mark(StackToolbarLeading, 'leading')

/**
 * Navigation-bar trailing items. Primary direction-aware name; Right is the
 * One Header-convention alias.
 */
export function StackToolbarTrailing(_props: StackToolbarSlotProps) {
  return null
}
mark(StackToolbarTrailing, 'trailing')

/**
 * Leaf toolbar button descriptor. Placement comes from the enclosing slot.
 */
export function StackToolbarItem(_props: StackToolbarItemProps) {
  return null
}
mark(StackToolbarItem, 'item')

/**
 * Interactive menu descriptor. Children are Item descriptors, nested Menu
 * descriptors become submenus on both header and bottom paths.
 */
export function StackToolbarMenu(_props: StackToolbarMenuProps) {
  return null
}
mark(StackToolbarMenu, 'menu')
