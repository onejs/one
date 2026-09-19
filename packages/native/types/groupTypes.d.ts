import type { ReactNode } from 'react';
import type { ViewProps } from 'react-native';
import type { ZStackAlignment } from './generated/containerTypes';
import type { ControlGroupStyle } from './generated/swiftui';
export declare const swipeActionsEdges: readonly ['leading', 'trailing'];
export type SwipeActionsEdge = (typeof swipeActionsEdges)[number];
export interface ControlGroupProps extends ViewProps {
    label?: string;
    systemImage?: string;
    controlGroupStyle?: ControlGroupStyle;
    children: ReactNode;
}
export interface DisclosureGroupProps extends ViewProps {
    label: string;
    isExpanded: boolean;
    onIsExpandedChange: (isExpanded: boolean) => void;
    revision?: number;
    children: ReactNode;
}
export type DividerProps = ViewProps;
export interface LinkProps extends ViewProps {
    destination: string;
    label?: string;
    children?: ReactNode;
}
export interface GroupProps extends ViewProps {
    children: ReactNode;
}
export interface OverlayProps extends ViewProps {
    alignment?: ZStackAlignment;
    children: ReactNode;
}
export interface OverlayContentProps extends ViewProps {
    children: ReactNode;
}
export interface SwipeActionsProps extends ViewProps {
    children: ReactNode;
}
export interface SwipeActionsActionsProps extends ViewProps {
    edge?: SwipeActionsEdge;
    allowsFullSwipe?: boolean;
    children: ReactNode;
}
export interface PageProps {
    id: string;
    testID?: string;
    children: ReactNode;
}
export interface PagerProps extends ViewProps {
    selection: string;
    onSelectionChange: (id: string) => void;
    revision?: number;
    children: ReactNode;
}
//# sourceMappingURL=groupTypes.d.ts.map