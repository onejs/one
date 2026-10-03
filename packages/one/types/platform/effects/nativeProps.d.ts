import { type ColorValue } from 'react-native';
import { type ResolvedEdgeFade } from './normalize';
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
    mode: string;
    blurRadius: number;
    frostProgression: number;
    overlayColor: number;
}
export declare function resolveVeilColor(color?: ColorValue): number;
export declare function resolveNativeProps(resolved: ResolvedEdgeFade, radius?: number): NativeEdgeFadeProps;
//# sourceMappingURL=nativeProps.d.ts.map