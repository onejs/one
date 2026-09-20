import type { Edge, EdgeInsets, EdgeMode, Edges, Metrics, NativeInsetsChangePayload } from './types';
export declare function resolveSafeAreaEdgeModes(edges?: Edges | null): Record<Edge, EdgeMode>;
export declare function buildSafeAreaInsetStyle(options: {
    insets: EdgeInsets;
    edges?: Edges | null;
    mode?: 'padding' | 'margin';
    style?: unknown;
    resolveStyle?: (style: any) => any;
}): Record<string, number>;
export declare function keyboardSafeBottom(systemBottom: number, stableBottom: number): number;
export declare function resolveOverlappingInsets(options: {
    windowInsets: EdgeInsets;
    windowWidth: number;
    windowHeight: number;
    visibleLeft: number;
    visibleTop: number;
    viewWidth: number;
    viewHeight: number;
}): EdgeInsets;
export declare function providerEventToMetrics(payload: NativeInsetsChangePayload): Metrics;
//# sourceMappingURL=insets.d.ts.map