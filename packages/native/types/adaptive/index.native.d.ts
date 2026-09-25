import type { HingeState, SizeClass } from './types';
import * as ReservedRegions from './ReservedRegions.native';
export type * from './types';
export { ReservedRegions };
/**
 * Returns the window's horizontal and vertical size class as live React state.
 * iOS reads the window scene's UIUserInterfaceSizeClass with live
 * trait-change updates; Android maps the activity window's WindowMetrics
 * (compact below 600dp wide / 480dp tall, else regular) and updates on
 * configuration and window-metrics changes.
 */
export declare function useSizeClass(): SizeClass;
export declare function getSizeClass(): Promise<SizeClass>;
/**
 * Returns the current hardware hinge state (angle in radians and status).
 * Null when the device has no hinge.
 */
export declare function useHinge(): HingeState | null;
export declare function getHinge(): Promise<HingeState | null>;
/**
 * Subscribes to hardware hinge changes.
 */
export declare function onHingeChange(callback: (hinge: HingeState | null) => void): () => void;
//# sourceMappingURL=index.native.d.ts.map