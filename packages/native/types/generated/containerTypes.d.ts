import type { ReactNode } from 'react';
import type { ColorValue, ViewProps } from 'react-native';
import type { GlassEffect, Material } from './controlTypes';
import type { ColorScheme, DynamicTypeSize } from './swiftui';
export type HostAxis = 'vertical' | 'horizontal';
export type HostAlignment = 'leading' | 'center' | 'trailing';
export type ZStackAlignment = 'topLeading' | 'top' | 'topTrailing' | 'leading' | 'center' | 'trailing' | 'bottomLeading' | 'bottom' | 'bottomTrailing';
export interface EnvironmentProps {
    colorScheme?: ColorScheme;
    dynamicTypeSize?: DynamicTypeSize;
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
export interface FormProps extends ViewProps, EnvironmentProps {
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
export interface GlassProps extends ViewProps {
    material?: Material;
    glassEffect?: GlassEffect;
    cornerRadius?: number;
    tint?: ColorValue;
    children: ReactNode;
}
export interface SlotProps extends ViewProps {
    height: number;
    width?: number;
    children: ReactNode;
}
export declare const hostAxes: readonly ['vertical', 'horizontal'];
export declare const hostAlignments: readonly ['leading', 'center', 'trailing'];
export declare const zStackAlignments: readonly ['topLeading', 'top', 'topTrailing', 'leading', 'center', 'trailing', 'bottomLeading', 'bottom', 'bottomTrailing'];
//# sourceMappingURL=containerTypes.d.ts.map