import type { Edge, EdgeInsets, EdgeMode, Edges, Metrics, NativeInsetsChangePayload } from './types';
export declare function resolveSafeAreaEdgeModes(edges?: Edges | null): Record<Edge, EdgeMode>;
export declare function buildSafeAreaInsetStyle(options: {
    insets: EdgeInsets;
    edges?: Edges | null;
    mode?: 'padding' | 'margin';
    style?: unknown;
}): Record<string, number>;
export declare function providerEventToMetrics(payload: NativeInsetsChangePayload): Metrics;
//# sourceMappingURL=insets.d.ts.map