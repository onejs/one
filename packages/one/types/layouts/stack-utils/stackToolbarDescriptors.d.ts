import type { ColorValue, ImageSourcePropType, StyleProp, TextStyle } from 'react-native';
import type { NativeStackHeaderItem, NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { type ReactNode } from 'react';
/**
 * Expo-exact toolbar placement. Bottom is the navigation-controller toolbar
 * owned by the screen; left/right are header items owned by
 * react-native-screens. Default is bottom, as in Expo.
 */
export type StackToolbarPlacement = 'left' | 'right' | 'bottom';
export type StackToolbarVariant = 'plain' | 'done' | 'prominent';
export interface StackToolbarProps {
    children?: ReactNode;
    placement?: StackToolbarPlacement;
    /**
     * Left/right only. Renders children as a custom header element instead of
     * header items, as in Expo.
     */
    asChild?: boolean;
}
export interface StackToolbarLabelProps {
    children?: string;
}
export type StackToolbarIconProps = {
    src: ImageSourcePropType;
    renderingMode?: 'template' | 'original';
} | {
    /** SF Symbol name. The only icon form the bottom bar takes. */
    sf: string;
} | {
    /** Xcode asset catalog image name. */
    xcasset: string;
    renderingMode?: 'template' | 'original';
};
export interface StackToolbarBadgeProps {
    children?: string;
    style?: StyleProp<Pick<TextStyle, 'fontFamily' | 'fontSize' | 'color' | 'fontWeight' | 'backgroundColor'>>;
}
export interface StackToolbarButtonProps {
    /**
     * Plain text, or Icon/Label/Badge primitives. Anything else throws in dev,
     * as in Expo.
     */
    children?: ReactNode;
    /** SF Symbol name or image source. Bottom takes SF strings only. */
    icon?: string | ImageSourcePropType;
    /** Custom image for bottom placement. */
    image?: ImageSourcePropType;
    iconRenderingMode?: 'template' | 'original';
    variant?: StackToolbarVariant;
    tintColor?: ColorValue;
    /** Label text style. Maps to labelStyle/titleStyle. */
    style?: StyleProp<TextStyle>;
    disabled?: boolean;
    hidden?: boolean;
    selected?: boolean;
    hidesSharedBackground?: boolean;
    /**
     * Separate this item's background from its neighbors. Default false, as in
     * Expo. Maps to sharesBackground = !separateBackground.
     */
    separateBackground?: boolean;
    accessibilityLabel?: string;
    accessibilityHint?: string;
    onPress?: () => void;
}
export interface StackToolbarMenuProps {
    /** Menu/MenuAction/Label/Icon/Badge. Anything else throws in dev. */
    children?: ReactNode;
    /** Title shown on top of the menu. Optional, as in Expo. */
    title?: string;
    icon?: string | ImageSourcePropType;
    image?: ImageSourcePropType;
    iconRenderingMode?: 'template' | 'original';
    variant?: StackToolbarVariant;
    tintColor?: ColorValue;
    style?: StyleProp<TextStyle>;
    disabled?: boolean;
    destructive?: boolean;
    hidden?: boolean;
    hidesSharedBackground?: boolean;
    separateBackground?: boolean;
    /** Submenus only. Maps to UIMenu.Options.displayInline. */
    inline?: boolean;
    /** Submenus only. Maps to UIMenu.Options.displayAsPalette. */
    palette?: boolean;
    /** Bottom only. Preferred size of the menu elements (iOS 16+). */
    elementSize?: 'auto' | 'small' | 'medium' | 'large';
    accessibilityLabel?: string;
    accessibilityHint?: string;
}
export interface StackToolbarMenuActionProps {
    /** Icon, Label, or string title. */
    children?: ReactNode;
    icon?: string | ImageSourcePropType;
    image?: ImageSourcePropType;
    iconRenderingMode?: 'template' | 'original';
    disabled?: boolean;
    destructive?: boolean;
    hidden?: boolean;
    /** Expo-exact name. Maps to keepsMenuPresented. */
    unstable_keepPresented?: boolean;
    isOn?: boolean;
    onPress?: () => void;
    discoverabilityLabel?: string;
    /** Maps to header action description, bottom action subtitle. */
    subtitle?: string;
    accessibilityLabel?: string;
    accessibilityHint?: string;
}
export interface StackToolbarSpacerProps {
    hidden?: boolean;
    /**
     * Fixed width. Required in left/right; without it the spacer is flexible
     * (bottom only).
     */
    width?: number;
    /** Bottom only. Whether the spacer joins the shared glass background. */
    sharesBackground?: boolean;
}
export interface StackToolbarSearchBarSlotProps {
    hidden?: boolean;
    hidesSharedBackground?: boolean;
    separateBackground?: boolean;
}
/** Marker set on toolbar compound components to identify slots/leaf nodes. */
export declare const TOOLBAR_KIND: '__oneStackToolbarKind';
export type StackToolbarKind = 'toolbar' | 'button' | 'menu' | 'menuAction' | 'spacer' | 'searchBarSlot' | 'label' | 'icon' | 'badge';
declare function isKind(element: ReactNode, kind: StackToolbarKind): boolean;
/** Joined string/number children, as in Expo's convertChildrenToString. */
export declare function toolbarChildrenToString(children: ReactNode): string;
interface BadgeData {
    value: string;
    backgroundColor?: ColorValue;
    color?: ColorValue;
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: TextStyle['fontWeight'];
}
/**
 * Convert toolbar children to native header items. Warns on children that do
 * not belong in left/right (search slots, primitives), as in Expo.
 */
export declare function toolbarChildrenToHeaderItems(children: ReactNode, placement: 'left' | 'right'): NativeStackHeaderItem[];
export interface BottomToolbarButtonData {
    kind: 'button';
    identifier: string;
    title?: string;
    systemImageName?: string;
    xcassetName?: string;
    image?: ImageSourcePropType;
    imageRenderingMode?: 'template' | 'original';
    tintColor?: ColorValue;
    barButtonItemStyle?: 'plain' | 'done' | 'prominent';
    sharesBackground: boolean;
    hidesSharedBackground?: boolean;
    hidden?: boolean;
    selected?: boolean;
    disabled?: boolean;
    badgeConfiguration?: BadgeData;
    titleStyle?: {
        fontFamily?: string;
        fontSize?: number;
        fontWeight?: TextStyle['fontWeight'];
        color?: ColorValue;
    };
    accessibilityLabel?: string;
    accessibilityHint?: string;
    handler: () => void;
}
export interface BottomToolbarMenuActionData {
    kind: 'action';
    identifier: string;
    title: string;
    icon?: string;
    xcassetName?: string;
    image?: ImageSourcePropType;
    imageRenderingMode?: 'template' | 'original';
    disabled?: boolean;
    destructive?: boolean;
    hidden?: boolean;
    isOn?: boolean;
    keepPresented?: boolean;
    discoverabilityLabel?: string;
    subtitle?: string;
    accessibilityLabel?: string;
    accessibilityHint?: string;
    handler: () => void;
}
export interface BottomToolbarSubmenuData {
    kind: 'submenu';
    identifier: string;
    title: string;
    icon?: string;
    xcassetName?: string;
    image?: ImageSourcePropType;
    imageRenderingMode?: 'template' | 'original';
    destructive?: boolean;
    hidden?: boolean;
    inline?: boolean;
    palette?: boolean;
    accessibilityLabel?: string;
    accessibilityHint?: string;
    children: (BottomToolbarMenuActionData | BottomToolbarSubmenuData)[];
}
export interface BottomToolbarMenuData {
    kind: 'menu';
    identifier: string;
    /** Title shown on top of the menu. */
    title: string;
    /** Bar-button label. */
    label: string;
    systemImageName?: string;
    xcassetName?: string;
    image?: ImageSourcePropType;
    imageRenderingMode?: 'template' | 'original';
    tintColor?: ColorValue;
    barButtonItemStyle?: 'plain' | 'done' | 'prominent';
    sharesBackground: boolean;
    hidesSharedBackground?: boolean;
    disabled?: boolean;
    destructive?: boolean;
    hidden?: boolean;
    inline?: boolean;
    palette?: boolean;
    elementSize?: 'auto' | 'small' | 'medium' | 'large';
    accessibilityLabel?: string;
    accessibilityHint?: string;
    children: (BottomToolbarMenuActionData | BottomToolbarSubmenuData)[];
}
export interface BottomToolbarSpacerData {
    kind: 'spacer';
    identifier: string;
    width?: number;
    sharesBackground?: boolean;
    hidden?: boolean;
}
export interface BottomToolbarSearchBarSlotData {
    kind: 'searchBar';
    identifier: string;
    sharesBackground: boolean;
    hidesSharedBackground?: boolean;
    hidden?: boolean;
}
export type BottomToolbarData = BottomToolbarButtonData | BottomToolbarMenuData | BottomToolbarMenuActionData | BottomToolbarSubmenuData | BottomToolbarSpacerData | BottomToolbarSearchBarSlotData;
/**
 * Convert bottom toolbar children to plain descriptors rendered by the
 * toolbar host. Unlike header items, hidden is preserved because the native
 * items own a hidden slot.
 */
export declare function toolbarChildrenToBottomData(children: ReactNode): BottomToolbarData[];
/**
 * Map one Stack.Toolbar to native-stack screen options. Left maps to
 * unstable_headerLeftItems and right to unstable_headerRightItems, the
 * genuine iOS header-item path in react-navigation 8 alpha, and forces the
 * header visible, as in Expo. An explicitly declared toolbar always wins
 * over incoming options: an empty conversion clears inherited items. Bottom
 * has no options equivalent (the toolbar is owned by the screen view
 * controller, so a bottom toolbar must mount in screen content); a bottom
 * toolbar in layout config warns and is ignored.
 */
export declare function appendStackToolbarPropsToOptions(options: NativeStackNavigationOptions, props: StackToolbarProps): NativeStackNavigationOptions;
export { isKind as isToolbarKind };
export type { NativeStackHeaderItem };
//# sourceMappingURL=stackToolbarDescriptors.d.ts.map