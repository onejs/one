import type { ReactNode } from 'react';
import type { NativeSyntheticEvent, ViewProps } from 'react-native';
export interface EdgeInsets {
    top: number;
    right: number;
    bottom: number;
    left: number;
}
export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface Metrics {
    insets: EdgeInsets;
    frame: Rect;
}
export type Edge = 'top' | 'right' | 'bottom' | 'left';
export type EdgeMode = 'off' | 'additive' | 'maximum';
export type EdgeRecord = Partial<Record<Edge, EdgeMode>>;
export type Edges = readonly Edge[] | Readonly<EdgeRecord>;
export interface NativeInsetsChangePayload {
    insetTop: number;
    insetRight: number;
    insetBottom: number;
    insetLeft: number;
    frameX: number;
    frameY: number;
    frameWidth: number;
    frameHeight: number;
}
export interface NativeSafeAreaProviderProps extends ViewProps {
    children?: ReactNode;
    onNativeInsetsChange: (event: NativeSyntheticEvent<NativeInsetsChangePayload>) => void;
}
//# sourceMappingURL=types.d.ts.map