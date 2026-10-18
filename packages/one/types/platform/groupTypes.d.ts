import type { ReactNode } from 'react';
import type { ViewProps } from 'react-native';
import type { SDKHandle } from './sdk/wire';
import type { ZStackAlignment } from './generated/containerTypes';
import type { SFSymbolName } from './generated/sfSymbolNames';
import type { ControlGroupStyle } from './generated/swiftui';
import type { OneNativeStyle } from './generated/controlTypes';
import type { ViewSlotConfiguration } from './generated/viewSlots';
export declare const swipeActionsEdges: readonly ['leading', 'trailing'];
export type SwipeActionsEdge = (typeof swipeActionsEdges)[number];
export interface ControlGroupProps extends ViewProps {
    swiftStyle?: OneNativeStyle;
    label?: string;
    systemImage?: SFSymbolName | '';
    controlGroupStyle?: ControlGroupStyle;
    children: ReactNode;
}
export interface DisclosureGroupProps extends ViewProps {
    swiftStyle?: OneNativeStyle;
    label: string;
    isExpanded: boolean;
    onIsExpandedChange: (isExpanded: boolean) => void;
    revision?: number;
    children: ReactNode;
}
export interface UIKitViewProps extends ViewProps {
    view: SDKHandle;
}
export interface DividerProps extends ViewProps {
    swiftStyle?: OneNativeStyle;
}
export interface LinkProps extends ViewProps {
    swiftStyle?: OneNativeStyle;
    destination: string;
    label?: string;
    children?: ReactNode;
}
export interface GroupProps extends ViewProps {
    swiftStyle?: OneNativeStyle;
    children: ReactNode;
}
export interface GroupBoxProps extends ViewProps {
    swiftStyle?: OneNativeStyle;
    label?: string;
    children?: ReactNode;
}
export interface ViewThatFitsProps extends ViewProps {
    swiftStyle?: OneNativeStyle;
    axes?: ViewThatFitsAxes;
    children: ReactNode;
}
export declare const viewThatFitsAxes: readonly ['horizontal', 'vertical', 'both'];
export type ViewThatFitsAxes = (typeof viewThatFitsAxes)[number];
export interface GlassEffectContainerProps extends ViewProps {
    swiftStyle?: OneNativeStyle;
    spacing?: number;
    children: ReactNode;
}
export interface GeometryProxySize {
    width: number;
    height: number;
}
export interface GeometryProxySafeAreaInsets {
    top: number;
    leading: number;
    bottom: number;
    trailing: number;
}
export interface GeometryProxyFrame {
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface GeometryProxy {
    readonly size: GeometryProxySize;
    readonly safeAreaInsets: GeometryProxySafeAreaInsets;
    frame(coordinateSpace: 'global' | 'local'): GeometryProxyFrame;
}
export interface GeometryReaderProps extends Omit<ViewProps, 'children'> {
    swiftStyle?: OneNativeStyle;
    children: (geometry: GeometryProxy) => ReactNode;
}
export type TimelineSchedule = 'everyMinute' | {
    type: 'periodic';
    from: Date;
    by: number;
} | {
    type: 'explicit';
    dates: readonly Date[];
};
export declare const timelineCadences: readonly ['live', 'seconds', 'minutes'];
export type TimelineCadence = (typeof timelineCadences)[number];
export interface TimelineViewContext {
    readonly date: Date;
    readonly cadence: TimelineCadence;
}
export interface TimelineViewProps extends Omit<ViewProps, 'children'> {
    swiftStyle?: OneNativeStyle;
    schedule: TimelineSchedule;
    children: (context: TimelineViewContext) => ReactNode;
}
export interface OverlayProps extends ViewProps {
    alignment?: ZStackAlignment;
    children: ReactNode;
}
export interface OverlayContentProps extends ViewProps {
    children: ReactNode;
}
export type ViewSlotProps = ViewProps & ViewSlotConfiguration & {
    children: ReactNode;
};
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