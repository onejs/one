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
    selection?: string[];
    onSelectionChange?: (selection: string[]) => void;
    swiftStyle?: OneNativeStyle;
    children: ReactNode;
}
export interface ScrollViewProps extends ViewProps {
    axes?: ScrollViewAxes;
    showsIndicators?: boolean;
    swiftStyle?: OneNativeStyle;
    children: ReactNode;
}
export interface LazyVStackProps extends ViewProps {
    swiftStyle?: OneNativeStyle;
    alignment?: LazyVStackAlignment;
    spacing?: number;
    children: ReactNode;
}
export interface LazyHStackProps extends ViewProps {
    swiftStyle?: OneNativeStyle;
    alignment?: LazyHStackAlignment;
    spacing?: number;
    children: ReactNode;
}
export interface OutlineGroupProps<Item extends object> extends Omit<ViewProps, 'children'> {
    swiftStyle?: OneNativeStyle;
    data: readonly Item[];
    idKey?: keyof Item;
    childrenKey: keyof Item;
    children: (item: Item) => ReactNode;
}
export interface TableColumn {
    id: string;
    title: string;
}
export declare const tableSortDirections: readonly ['ascending', 'descending'];
export type TableSortDirection = (typeof tableSortDirections)[number];
export interface TableSort {
    column: string;
    direction: TableSortDirection;
}
export interface TableProps<Item extends object> extends Omit<ViewProps, 'children'> {
    swiftStyle?: OneNativeStyle;
    data: readonly Item[];
    idKey?: keyof Item;
    columns: readonly TableColumn[];
    sort?: TableSort | null;
    onSortChange?: (sort: TableSort) => void;
    revision?: number;
    children: (item: Item, column: TableColumn) => ReactNode;
}
export declare const unitPoints: {
    readonly zero: {
        readonly x: 0;
        readonly y: 0;
    };
    readonly center: {
        readonly x: 0.5;
        readonly y: 0.5;
    };
    readonly leading: {
        readonly x: 0;
        readonly y: 0.5;
    };
    readonly trailing: {
        readonly x: 1;
        readonly y: 0.5;
    };
    readonly top: {
        readonly x: 0.5;
        readonly y: 0;
    };
    readonly bottom: {
        readonly x: 0.5;
        readonly y: 1;
    };
    readonly topLeading: {
        readonly x: 0;
        readonly y: 0;
    };
    readonly topTrailing: {
        readonly x: 1;
        readonly y: 0;
    };
    readonly bottomLeading: {
        readonly x: 0;
        readonly y: 1;
    };
    readonly bottomTrailing: {
        readonly x: 1;
        readonly y: 1;
    };
};
export type UnitPointName = keyof typeof unitPoints;
export type UnitPoint = UnitPointName | {
    x: number;
    y: number;
};
export interface ScrollViewProxy {
    scrollTo(id: string, anchor?: UnitPoint | null): void;
}
export interface ScrollViewReaderProps extends Omit<ViewProps, 'children'> {
    swiftStyle?: OneNativeStyle;
    children: (proxy: ScrollViewProxy) => ReactNode;
}
//# sourceMappingURL=listTypes.d.ts.map