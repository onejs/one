import type { ColorValue, StyleProp, ViewStyle } from 'react-native';
import type { EdgeFadeCurve, EdgeFadeMode, EdgeFadeProps } from './types';
export declare const DEFAULT_CURVE: EdgeFadeCurve;
export interface ResolvedEdge {
    size: number;
    curve: EdgeFadeCurve;
    color?: ColorValue;
}
export interface ResolvedEdgeFade {
    top: ResolvedEdge | null;
    bottom: ResolvedEdge | null;
    left: ResolvedEdge | null;
    right: ResolvedEdge | null;
    mode: EdgeFadeMode;
    color?: ColorValue;
    blurRadius: number;
    frostProgression: number;
}
export declare function resolveEdges(props: EdgeFadeProps, isRTL: boolean): ResolvedEdgeFade;
/**
 * the `radius` prop is the only corner source: it feeds the native mask on
 * the mask path and a clipped container on the core overlay path, so both
 * modes round identically. `style.borderRadius` would only round the
 * wrapper without touching the fade, so it is ignored loudly.
 */
export declare function resolveRadius(radius: number | undefined, styleRadius: unknown): number | undefined;
export declare function flattenStyle(style: StyleProp<ViewStyle>): Record<string, unknown>;
//# sourceMappingURL=normalize.d.ts.map