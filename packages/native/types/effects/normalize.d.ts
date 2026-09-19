import { type ColorValue, type StyleProp, type ViewStyle } from 'react-native';
import type { EdgeFadeCurve, EdgeFadeMode, EdgeFadeProps } from './types';
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
}
export declare function resolveEdges(props: EdgeFadeProps): ResolvedEdgeFade;
export interface NativeEdgeFadeProps {
    fadeTop: number;
    fadeBottom: number;
    fadeLeft: number;
    fadeRight: number;
    curveTop: string;
    curveBottom: string;
    curveLeft: string;
    curveRight: string;
    fadeRadius: number;
}
export declare function resolveNativeProps(resolved: ResolvedEdgeFade, radius?: number): NativeEdgeFadeProps;
/**
 * the `radius` prop is the only corner source: it feeds the native mask on
 * the mask path and a clipped container on the core overlay path, so both
 * modes round identically. `style.borderRadius` would only round the
 * wrapper without touching the fade, so it is ignored loudly.
 */
export declare function resolveRadius(radius: number | undefined, style: StyleProp<ViewStyle>): number | undefined;
//# sourceMappingURL=normalize.d.ts.map