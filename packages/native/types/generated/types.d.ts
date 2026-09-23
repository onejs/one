import type { ReactNode } from 'react';
import type { ViewProps } from 'react-native';
import type { MenuOrder, MenuActionDismissBehavior, ButtonRole, ControlGroupStyle } from './swiftui';
export type { MenuOrder, Visibility, PickerStyle, DatePickerStyle, ToggleStyle, MenuActionDismissBehavior, TabViewStyle, ButtonRole, TabRole, TabPlacement, AdaptableTabBarPlacement, TabCustomizationBehavior, TabSectionExpansion, SpringLoadingBehavior, ControlGroupStyle, PrimitiveButtonStyle, ProgressViewStyle, GaugeStyle, TextFieldStyle, SubmitLabel, TextInputAutocapitalization, Axis, Edge, PresentationAdaptation, PresentationContentInteraction, ColorScheme, DynamicTypeSize, ControlSize, SymbolRenderingMode, SymbolVariants, ImageScale, PhotosPickerSelectionBehavior, EncodingDisambiguationPolicy, BackForwardNavigationGesturesBehavior, MagnificationGesturesBehavior, LinkPreviewBehavior, ElementFullscreenBehavior, ListStyle, } from './swiftui';
export interface SwiftMenuAction {
    type: 'action';
    id: string;
    title: string;
    systemImage?: string;
    role?: ButtonRole;
    disabled?: boolean;
    hidden?: boolean;
    help?: string;
    menuActionDismissBehavior?: MenuActionDismissBehavior;
}
export interface MenuToggle {
    type: 'toggle';
    id: string;
    title: string;
    systemImage?: string;
    values: readonly boolean[];
    disabled?: boolean;
    hidden?: boolean;
    help?: string;
    menuActionDismissBehavior?: MenuActionDismissBehavior;
}
export interface MenuSubmenu {
    type: 'submenu';
    id: string;
    title: string;
    systemImage?: string;
    disabled?: boolean;
    hidden?: boolean;
    help?: string;
    menuOrder?: MenuOrder;
    menuActionDismissBehavior?: MenuActionDismissBehavior;
    children: readonly MenuItem[];
}
export interface MenuSection {
    type: 'section';
    id: string;
    title?: string;
    hidden?: boolean;
    children: readonly MenuItem[];
}
export interface MenuControlGroup {
    type: 'controlGroup';
    id: string;
    title?: string;
    systemImage?: string;
    disabled?: boolean;
    hidden?: boolean;
    controlGroupStyle?: ControlGroupStyle;
    children: readonly MenuItem[];
}
export interface MenuDivider {
    type: 'divider';
    id: string;
}
export type MenuItem = SwiftMenuAction | MenuToggle | MenuSubmenu | MenuSection | MenuControlGroup | MenuDivider;
export interface MenuProps extends ViewProps {
    items: readonly MenuItem[];
    onAction: (id: string) => void;
    onValueChange?: (id: string, value: boolean, sourceIndex: number) => void;
    accessibilityLabel: string;
    revision?: number;
    disabled?: boolean;
    menuOrder?: MenuOrder;
    menuActionDismissBehavior?: MenuActionDismissBehavior;
    children: ReactNode;
}
export type ContextMenuProps = Omit<MenuProps, 'accessibilityLabel'> & {
    accessibilityLabel?: string;
};
//# sourceMappingURL=types.d.ts.map