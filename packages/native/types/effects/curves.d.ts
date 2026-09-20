import type { EdgeFadeCurve } from './types';
/**
 * sample any curve to inner-to-outer alpha values. presets evaluate
 * analytically at 32 stops (the native table density); bezier and stops
 * follow the same path the native serializer uses.
 */
export declare function sampleCurve(curve: EdgeFadeCurve): number[];
/**
 * convert any curve to the string the native primitive accepts: preset
 * names pass through, bezier and stops serialize as comma-separated
 * inner-to-outer alphas.
 */
export declare function serializeCurve(curve: EdgeFadeCurve): string;
//# sourceMappingURL=curves.d.ts.map