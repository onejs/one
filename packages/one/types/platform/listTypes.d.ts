import type { ReactNode } from 'react';
import type { ViewProps } from 'react-native';
import type { ListStyle } from './generated/swiftui';
import type { OneNativeStyle } from './generated/controlTypes';
export declare const scrollViewAxes: readonly ['vertical', 'horizontal', 'both'];
export type ScrollViewAxes = (typeof scrollViewAxes)[number];
export declare const lazyVStackAlignments: readonly ['leading', 'center', 'trailing'];
export type LazyVStackAlignment = (typeof lazyVStackAlignments)[number];
export declare const lazyHStackAlignments: readonly ['top', 'center', 'bottom', 'firstTextBaseline', 'lastTextBaseline'];
export type LazyHStackAlignment = (typeof lazyHStackAlignments)[number];
export interface ListProps extends ViewProps {
    listStyle?: ListStyle;
    children: ReactNode;
}
export interface ScrollViewProps extends ViewProps {
    axes?: ScrollViewAxes;
    showsIndicators?: boolean;
    swiftStyle?: OneNativeStyle;
    children: ReactNode;
}
export interface LazyVStackProps extends ViewProps {
    alignment?: LazyVStackAlignment;
    spacing?: number;
    children: ReactNode;
}
export interface LazyHStackProps extends ViewProps {
    alignment?: LazyHStackAlignment;
    spacing?: number;
    children: ReactNode;
}
//# sourceMappingURL=listTypes.d.ts.map