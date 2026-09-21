import { type StackToolbarItemProps, type StackToolbarMenuProps, type StackToolbarProps, type StackToolbarSlotProps } from './stackToolbarDescriptors';
export type { BottomToolbarData, BottomToolbarItemData, BottomToolbarMenuData, StackToolbarBottomProps, StackToolbarItemProps, StackToolbarMenuProps, StackToolbarPlacement, StackToolbarProps, StackToolbarSlotProps, } from './stackToolbarDescriptors';
export { appendStackToolbarPropsToOptions } from './stackToolbarDescriptors';
/**
 * Grouping container for toolbar slots. Use in Stack.Screen or stack-level
 * children, mirroring Stack.Header. Leading/trailing slots compile to native
 * header items; Bottom in layout config warns because the toolbar host must
 * mount inside screen content.
 */
export declare function StackToolbarComponent(_props: StackToolbarProps): null;
/**
 * Navigation-bar leading items. Primary direction-aware name; Left is the
 * One Header-convention alias.
 */
export declare function StackToolbarLeading(_props: StackToolbarSlotProps): null;
/**
 * Navigation-bar trailing items. Primary direction-aware name; Right is the
 * One Header-convention alias.
 */
export declare function StackToolbarTrailing(_props: StackToolbarSlotProps): null;
/**
 * Leaf toolbar button descriptor. Placement comes from the enclosing slot.
 */
export declare function StackToolbarItem(_props: StackToolbarItemProps): null;
/**
 * Interactive menu descriptor. Children are Item descriptors, nested Menu
 * descriptors become submenus on both header and bottom paths.
 */
export declare function StackToolbarMenu(_props: StackToolbarMenuProps): null;
//# sourceMappingURL=StackToolbar.d.ts.map