import type { ColorValue } from 'react-native';
import type { NativeStackHeaderItem, NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { type ReactElement, type ReactNode } from 'react';
/**
 * Declarative toolbar placement. Leading/trailing are direction-aware and
 * follow the native cross-direction contract (SwiftUI topBarLeading /
 * topBarTrailing, UIKit mirrored left/right). Bottom is the retained
 * navigation-controller toolbar capability.
 */
export type StackToolbarPlacement = 'leading' | 'trailing' | 'bottom';
export interface StackToolbarItemProps {
    children?: ReactNode;
    identifier?: string;
    title?: string;
    /**
     * Secondary text for menu actions. Maps to the header menu action
     * description and has no slot on top-level buttons.
     */
    description?: string;
    /**
     * iOS SF Symbol name. Header items map this to `{ type: 'sfSymbol', name }`;
     * bottom items map it to the toolbar item system image. No new Icon
     * contract is introduced here on purpose.
     */
    systemImageName?: string;
    /**
     * Passed through untouched wherever the underlying item accepts it,
     * including platform dynamic iOS values.
     */
    tintColor?: ColorValue;
    disabled?: boolean;
    /**
     * Liquid-glass background sharing (iOS 26+). Passed to header items and
     * bottom toolbar items alike.
     */
    sharesBackground?: boolean;
    hidesSharedBackground?: boolean;
    /**
     * Top-level header items have no hidden slot in react-navigation, so hidden
     * leading/trailing items are omitted. Bottom items pass hidden through to
     * the toolbar item.
     */
    hidden?: boolean;
    /**
     * Selected state. Maps to the header button/menu-action state and the
     * toolbar item selected flag.
     */
    selected?: boolean;
    /**
     * Menu-only. There is no destructive slot on top-level bar buttons, so a
     * top-level destructive item keeps its button behavior without destructive
     * styling.
     */
    destructive?: boolean;
    accessibilityLabel?: string;
    accessibilityHint?: string;
    onPress?: () => void;
    /** Alias of onPress, matching the ToolbarItem/MenuAction naming. */
    onSelected?: () => void;
}
export interface StackToolbarMenuProps {
    children?: ReactNode;
    identifier?: string;
    title: string;
    /** Bar-button label. Defaults to title when the menu sits in a bar. */
    label?: string;
    systemImageName?: string;
    tintColor?: ColorValue;
    disabled?: boolean;
    /** Liquid-glass background sharing (iOS 26+). */
    sharesBackground?: boolean;
    hidesSharedBackground?: boolean;
    hidden?: boolean;
    accessibilityLabel?: string;
    accessibilityHint?: string;
}
export interface StackToolbarProps {
    children?: ReactNode;
}
export interface StackToolbarSlotProps {
    children?: ReactNode;
}
export interface StackToolbarBottomProps {
    children?: ReactNode;
    hidden?: boolean;
    animated?: boolean;
}
/** Marker set on toolbar compound components to identify slots/leaf nodes. */
export declare const TOOLBAR_KIND: '__oneStackToolbarKind';
export type StackToolbarKind = 'toolbar' | 'leading' | 'trailing' | 'bottom' | 'item' | 'menu';
declare function isKind(element: ReactNode, kind: StackToolbarKind): boolean;
export declare function resolveToolbarHandler(props: StackToolbarItemProps): () => void;
/**
 * Convert one Item descriptor to a header button. Returns null for hidden
 * items (no hidden slot on header buttons) and for items with neither title
 * nor icon (nothing renderable).
 */
export declare function itemPropsToHeaderButton(props: StackToolbarItemProps, index: number, slot: 'leading' | 'trailing'): NativeStackHeaderItem | null;
/**
 * Convert one Menu descriptor to a header menu item. Returns null for hidden
 * or empty menus.
 */
export declare function menuPropsToHeaderMenu(element: ReactElement, index: number, slot: 'leading' | 'trailing'): NativeStackHeaderItem | null;
/**
 * Convert slot children to native header items. Hidden and empty descriptors
 * are omitted because header buttons have no hidden slot.
 */
export declare function slotChildrenToHeaderItems(children: ReactNode, slot: 'leading' | 'trailing'): NativeStackHeaderItem[];
export interface BottomToolbarItemData {
    kind: 'item';
    identifier: string;
    title?: string;
    systemImageName?: string;
    tintColor?: ColorValue;
    disabled?: boolean;
    sharesBackground?: boolean;
    hidesSharedBackground?: boolean;
    hidden?: boolean;
    selected?: boolean;
    /** Carried for menu children; maps to the MenuAction destructive flag. */
    destructive?: boolean;
    accessibilityLabel?: string;
    accessibilityHint?: string;
    handler: () => void;
}
export interface BottomToolbarMenuData {
    kind: 'menu';
    identifier: string;
    title: string;
    label?: string;
    icon?: string;
    tintColor?: ColorValue;
    disabled?: boolean;
    sharesBackground?: boolean;
    hidesSharedBackground?: boolean;
    hidden?: boolean;
    accessibilityLabel?: string;
    accessibilityHint?: string;
    children: (BottomToolbarItemData | BottomToolbarMenuData)[];
}
export type BottomToolbarData = BottomToolbarItemData | BottomToolbarMenuData;
/**
 * Convert bottom slot children to plain toolbar descriptors. Unlike header
 * items, hidden is preserved because ToolbarItem/MenuAction own a hidden slot.
 * Nested menus are preserved as submenu descriptors.
 */
export declare function slotChildrenToBottomData(children: ReactNode): BottomToolbarData[];
/**
 * Map Stack.Toolbar children to native-stack screen options. Leading maps to
 * unstable_headerLeftItems and trailing to unstable_headerRightItems, the
 * genuine iOS header-item path in react-navigation 8 alpha. An explicitly
 * declared slot always wins over incoming options: an empty slot (for
 * example, all items hidden) clears inherited items, while an absent slot
 * preserves them. Bottom has no options equivalent (the toolbar is owned by
 * the screen view controller, so Stack.Toolbar.Bottom must mount in screen
 * content); a bottom slot in layout config warns and is ignored.
 */
export declare function appendStackToolbarPropsToOptions(options: NativeStackNavigationOptions, props: StackToolbarProps): NativeStackNavigationOptions;
export { isKind as isToolbarKind };
//# sourceMappingURL=stackToolbarDescriptors.d.ts.map