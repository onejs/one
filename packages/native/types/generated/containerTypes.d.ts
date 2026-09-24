import type { ReactNode } from 'react';
import type { ColorValue, ViewProps } from 'react-native';
import type { GlassEffect, GlassEffectShape, Material, OneNativeViewProps } from './controlTypes';
import type * as Styles from './swiftui';
import type { ColorScheme, ControlSize, DynamicTypeSize, SpacerSizing, ToolbarItemPlacement } from './swiftui';
export type HostAxis = 'vertical' | 'horizontal';
export type HostAlignment = 'leading' | 'center' | 'trailing';
export type ZStackAlignment = 'topLeading' | 'top' | 'topTrailing' | 'leading' | 'center' | 'trailing' | 'bottomLeading' | 'bottom' | 'bottomTrailing';
export interface EnvironmentProps {
    colorScheme?: ColorScheme;
    dynamicTypeSize?: DynamicTypeSize;
    controlSize?: ControlSize;
    locale?: string;
    tint?: ColorValue;
    isEnabled?: boolean;
}
export interface HostProps extends ViewProps, EnvironmentProps {
    axis?: HostAxis;
    spacing?: number;
    alignment?: HostAlignment;
    children: ReactNode;
}
export type StackProps = Omit<HostProps, 'axis'>;
export interface ZStackProps extends ViewProps {
    alignment?: ZStackAlignment;
    children: ReactNode;
}
export interface SpacerProps extends ViewProps {
    minLength?: number;
}
export type FormSizing = 'fill' | 'content';
export interface FormProps extends ViewProps, EnvironmentProps {
    sizing?: FormSizing;
    children: ReactNode;
}
export interface SectionProps extends ViewProps {
    title?: string;
    footer?: string;
    children: ReactNode;
}
export interface LabeledContentProps extends ViewProps {
    label: string;
    value?: string;
    systemImage?: string;
    children?: ReactNode;
}
export interface ButtonProps extends OneNativeViewProps {
    onPress?: () => void;
    label?: string;
    disabled?: boolean;
    subtitle?: string;
    systemImage?: string;
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
export interface ToolbarProps extends ViewProps {
    children: ReactNode;
}
export interface ToolbarItemProps extends OneNativeViewProps {
    placement?: ToolbarItemPlacement;
    children: ReactNode;
}
export interface ToolbarItemGroupProps extends OneNativeViewProps {
    placement?: ToolbarItemPlacement;
    label?: string;
    systemImage?: string;
    children: ReactNode;
}
export interface ToolbarSpacerProps extends ViewProps {
    sizing?: SpacerSizing;
    placement?: ToolbarItemPlacement;
}
export declare const hostAxes: readonly ['vertical', 'horizontal'];
export declare const hostAlignments: readonly ['leading', 'center', 'trailing'];
export declare const zStackAlignments: readonly ['topLeading', 'top', 'topTrailing', 'leading', 'center', 'trailing', 'bottomLeading', 'bottom', 'bottomTrailing'];
//# sourceMappingURL=containerTypes.d.ts.map