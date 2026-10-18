import type { ReactNode } from 'react';
import type { ColorValue, ViewProps } from 'react-native';
import type { GlassEffect, GlassEffectShape, Material, OneNativeStyle, OneNativeViewProps } from './controlTypes';
import type * as Styles from './swiftui';
import type { ColorScheme, ControlSize, DynamicTypeSize, SpacerSizing, ToolbarItemPlacement } from './swiftui';
import type { SFSymbolName } from './sfSymbolNames';
export type HStackAlignment = 'top' | 'center' | 'bottom' | 'firstTextBaseline' | 'lastTextBaseline';
export type VStackAlignment = 'leading' | 'center' | 'trailing' | 'listRowSeparatorLeading' | 'listRowSeparatorTrailing';
export type ZStackAlignment = 'topLeading' | 'top' | 'topTrailing' | 'leading' | 'center' | 'trailing' | 'bottomLeading' | 'bottom' | 'bottomTrailing';
export interface EnvironmentProps {
    colorScheme?: ColorScheme;
    dynamicTypeSize?: DynamicTypeSize;
    controlSize?: ControlSize;
    locale?: string;
    tint?: ColorValue;
    isEnabled?: boolean;
}
export interface HStackProps extends ViewProps {
    alignment?: HStackAlignment;
    spacing?: number;
    swiftStyle?: OneNativeStyle;
    children: ReactNode;
}
export interface VStackProps extends ViewProps {
    alignment?: VStackAlignment;
    spacing?: number;
    swiftStyle?: OneNativeStyle;
    children: ReactNode;
}
export interface ZStackProps extends ViewProps {
    alignment?: ZStackAlignment;
    swiftStyle?: OneNativeStyle;
    children: ReactNode;
}
export interface SpacerProps extends ViewProps {
    minLength?: number;
    swiftStyle?: OneNativeStyle;
}
export type FormSizing = 'fill' | 'content';
export interface FormProps extends ViewProps, EnvironmentProps {
    sizing?: FormSizing;
    swiftStyle?: OneNativeStyle;
    children: ReactNode;
}
export interface SectionProps extends ViewProps {
    title?: string;
    footer?: string;
    swiftStyle?: OneNativeStyle;
    children: ReactNode;
}
export interface LabeledContentProps extends ViewProps {
    label: string;
    value?: string;
    systemImage?: SFSymbolName | '';
    swiftStyle?: OneNativeStyle;
    children?: ReactNode;
}
export interface ButtonProps extends OneNativeViewProps {
    onPress?: () => void;
    label?: string;
    disabled?: boolean;
    subtitle?: string;
    systemImage?: SFSymbolName | '';
    buttonRole?: Styles.ButtonRole | '';
    buttonStyle?: Styles.PrimitiveButtonStyle;
    disclosureIndicator?: boolean;
    children?: ReactNode;
}
export interface GlassProps extends ViewProps {
    material?: Material;
    glassEffect?: GlassEffect;
    interactive?: boolean;
    shape?: GlassEffectShape;
    cornerRadius?: number;
    tint?: ColorValue;
    colorScheme?: ColorScheme;
    swiftStyle?: OneNativeStyle;
    children: ReactNode;
}
export interface SlotProps extends ViewProps {
    height: number;
    width?: number;
    children: ReactNode;
}
export interface NavigationStackProps extends OneNativeViewProps {
    children: ReactNode;
}
export type NavigationSplitViewVisibility = 'automatic' | 'all' | 'doubleColumn' | 'detailOnly';
export type NavigationSplitViewColumn = 'sidebar' | 'content' | 'detail';
export interface NavigationSplitViewProps extends OneNativeViewProps {
    columnVisibility?: NavigationSplitViewVisibility;
    onColumnVisibilityChange?: (visibility: NavigationSplitViewVisibility) => void;
    preferredCompactColumn?: NavigationSplitViewColumn;
    onPreferredCompactColumnChange?: (column: NavigationSplitViewColumn) => void;
    children: ReactNode;
}
export interface NavigationSplitViewColumnProps extends OneNativeViewProps {
    children: ReactNode;
}
export interface ToolbarProps extends ViewProps {
    children: ReactNode;
}
export interface ToolbarContentProps extends ViewProps {
    children: ReactNode;
}
export interface ToolbarItemProps extends OneNativeViewProps {
    placement?: ToolbarItemPlacement;
    children: ReactNode;
}
export interface ToolbarItemGroupProps extends OneNativeViewProps {
    placement?: ToolbarItemPlacement;
    label?: string;
    systemImage?: SFSymbolName | '';
    children: ReactNode;
}
export interface ToolbarSpacerProps extends ViewProps {
    sizing?: SpacerSizing;
    placement?: ToolbarItemPlacement;
}
export declare const hStackAlignments: readonly ['top', 'center', 'bottom', 'firstTextBaseline', 'lastTextBaseline'];
export declare const vStackAlignments: readonly ['leading', 'center', 'trailing', 'listRowSeparatorLeading', 'listRowSeparatorTrailing'];
export declare const zStackAlignments: readonly ['topLeading', 'top', 'topTrailing', 'leading', 'center', 'trailing', 'bottomLeading', 'bottom', 'bottomTrailing'];
//# sourceMappingURL=containerTypes.d.ts.map