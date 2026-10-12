import { isToolbarKind, type StackToolbarBadgeProps, type StackToolbarButtonProps, type StackToolbarIconProps, type StackToolbarLabelProps, type StackToolbarMenuActionProps, type StackToolbarMenuProps, type StackToolbarProps, type StackToolbarSearchBarSlotProps, type StackToolbarSpacerProps } from './stackToolbarDescriptors';
export type { BottomToolbarButtonData, BottomToolbarData, BottomToolbarMenuActionData, BottomToolbarMenuData, BottomToolbarSearchBarSlotData, BottomToolbarSpacerData, BottomToolbarSubmenuData, StackToolbarBadgeProps, StackToolbarButtonProps, StackToolbarIconProps, StackToolbarLabelProps, StackToolbarMenuActionProps, StackToolbarMenuProps, StackToolbarPlacement, StackToolbarProps, StackToolbarSearchBarSlotProps, StackToolbarSpacerProps, StackToolbarVariant, } from './stackToolbarDescriptors';
export { appendStackToolbarPropsToOptions } from './stackToolbarDescriptors';
/**
 * Declarative toolbar. Bottom (the default) renders the navigation-controller
 * toolbar in place and must mount in screen content; left/right set header
 * items, from layout config or, when rendered in a page, through the
 * screen's navigation options, as in Expo.
 */
export declare function StackToolbarComponent(props: StackToolbarProps): import("react/jsx-runtime").JSX.Element | null;
/**
 * Leaf toolbar button descriptor. Placement comes from the enclosing
 * Stack.Toolbar.
 */
export declare function StackToolbarButton(_props: StackToolbarButtonProps): null;
/**
 * Interactive menu descriptor. Children are MenuAction descriptors, nested
 * Menu descriptors become submenus. Label/Icon children configure the bar
 * item; title is the menu title.
 */
export declare function StackToolbarMenu(_props: StackToolbarMenuProps): null;
/** Leaf menu action descriptor. */
export declare function StackToolbarMenuAction(_props: StackToolbarMenuActionProps): null;
/** Flexible spacer, or fixed when width is set. */
export declare function StackToolbarSpacer(_props: StackToolbarSpacerProps): null;
/** Bottom-only slot for the screen's search bar. */
export declare function StackToolbarSearchBarSlot(_props: StackToolbarSearchBarSlotProps): null;
/** Text label primitive for Button and Menu children. */
export declare function StackToolbarLabel(_props: StackToolbarLabelProps): null;
/** Icon primitive for Button, Menu, and MenuAction children. */
export declare function StackToolbarIcon(_props: StackToolbarIconProps): null;
/** Badge primitive. Left/right only; bottom throws in dev. */
export declare function StackToolbarBadge(_props: StackToolbarBadgeProps): null;
export { isToolbarKind };
//# sourceMappingURL=StackToolbar.d.ts.map