import type { ReactNode } from 'react';
import type { ColorValue, ImageSourcePropType, StyleProp, TextStyle } from 'react-native';
export type StackToolbarPlacement = 'left' | 'right' | 'bottom';
export interface StackToolbarProps {
    children?: ReactNode;
    placement?: StackToolbarPlacement;
    asChild?: boolean;
    /** Android-only. The Android toolbar host is not implemented yet. */
    disableImePadding?: boolean;
    /** Android-only. The Android toolbar host is not implemented yet. */
    tintColor?: ColorValue;
    /** Android-only. The Android toolbar host is not implemented yet. */
    backgroundColor?: ColorValue;
}
export interface StackToolbarIconProps {
    src?: ImageSourcePropType;
    sf?: string;
    xcasset?: string;
    renderingMode?: 'template' | 'original';
}
export interface StackToolbarLabelProps {
    children?: string;
}
export interface StackToolbarBadgeProps {
    children?: string;
    style?: StyleProp<Pick<TextStyle, 'fontFamily' | 'fontSize' | 'fontWeight' | 'color' | 'backgroundColor'>>;
}
export interface StackToolbarItemProps {
    children?: ReactNode;
    icon?: string | ImageSourcePropType;
    iconRenderingMode?: 'template' | 'original';
    tintColor?: ColorValue;
    hidden?: boolean;
    disabled?: boolean;
    accessibilityLabel?: string;
    accessibilityHint?: string;
    hidesSharedBackground?: boolean;
    separateBackground?: boolean;
    style?: StyleProp<TextStyle>;
}
export interface StackToolbarButtonProps extends StackToolbarItemProps {
    image?: ImageSourcePropType;
    onPress?: () => void;
    selected?: boolean;
    variant?: 'plain' | 'done' | 'prominent';
}
export interface StackToolbarMenuProps extends StackToolbarItemProps {
    image?: ImageSourcePropType;
    destructive?: boolean;
    title?: string;
    inline?: boolean;
    palette?: boolean;
    singleSelection?: boolean;
    elementSize?: 'auto' | 'small' | 'medium' | 'large';
    variant?: 'plain' | 'done' | 'prominent';
}
export interface StackToolbarMenuActionProps extends StackToolbarItemProps {
    image?: ImageSourcePropType;
    destructive?: boolean;
    discoverabilityLabel?: string;
    subtitle?: string;
    isOn?: boolean;
    onPress?: () => void;
    unstable_keepPresented?: boolean;
}
export interface StackToolbarSpacerProps {
    width?: number;
    hidden?: boolean;
    sharesBackground?: boolean;
}
export interface StackToolbarSearchBarSlotProps {
    hidden?: boolean;
    hidesSharedBackground?: boolean;
    separateBackground?: boolean;
}
export interface StackToolbarViewProps {
    children?: ReactNode;
    hidden?: boolean;
    hidesSharedBackground?: boolean;
    separateBackground?: boolean;
}
//# sourceMappingURL=StackToolbar.types.d.ts.map