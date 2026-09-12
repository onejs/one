import type { ReactNode } from 'react';
import type { ColorValue, ViewProps } from 'react-native';
import type { ColorScheme, DynamicTypeSize } from './swiftui';
export type HostAxis = 'vertical' | 'horizontal';
export type HostAlignment = 'leading' | 'center' | 'trailing';
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
export interface FormProps extends ViewProps, EnvironmentProps {
    children: ReactNode;
}
export interface SectionProps extends ViewProps {
    title?: string;
    footer?: string;
    children: ReactNode;
}
export interface SlotProps extends ViewProps {
    height: number;
    width?: number;
    children: ReactNode;
}
export declare const hostAxes: readonly ["vertical", "horizontal"];
export declare const hostAlignments: readonly ["leading", "center", "trailing"];
//# sourceMappingURL=containerTypes.d.ts.map