import type { ReactNode } from 'react';
import type { ViewProps } from 'react-native';
export declare const gridAlignments: readonly ['topLeading', 'top', 'topTrailing', 'leading', 'center', 'trailing', 'bottomLeading', 'bottom', 'bottomTrailing'];
export declare const gridHorizontalAlignments: readonly ['leading', 'center', 'trailing'];
export declare const gridVerticalAlignments: readonly ['top', 'center', 'bottom', 'firstTextBaseline', 'lastTextBaseline'];
export type GridAlignment = (typeof gridAlignments)[number];
export type GridHorizontalAlignment = (typeof gridHorizontalAlignments)[number];
export type GridVerticalAlignment = (typeof gridVerticalAlignments)[number];
type GridItemBase = {
    spacing?: number;
    alignment?: GridAlignment;
};
export type GridItem = GridItemBase & ({
    size: 'fixed';
    value: number;
} | {
    size: 'flexible';
    minimum?: number;
    maximum?: number;
} | {
    size: 'adaptive';
    minimum: number;
    maximum?: number;
});
export interface LazyVGridProps extends ViewProps {
    columns: readonly GridItem[];
    alignment?: GridHorizontalAlignment;
    spacing?: number;
    children: ReactNode;
}
export interface LazyHGridProps extends ViewProps {
    rows: readonly GridItem[];
    alignment?: GridVerticalAlignment;
    spacing?: number;
    children: ReactNode;
}
export interface GridProps extends ViewProps {
    alignment?: GridAlignment;
    horizontalSpacing?: number;
    verticalSpacing?: number;
    children: ReactNode;
}
export interface GridRowProps extends ViewProps {
    alignment?: GridVerticalAlignment;
    children: ReactNode;
}
export declare function gridSpacing(value: number | undefined, owner: string): string;
export declare function gridItems(items: readonly GridItem[], owner: string): string;
export {};
//# sourceMappingURL=gridTypes.d.ts.map