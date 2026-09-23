import type { HingeState, ReservedRegion, ReservedRegionKind, ReservedRegionOptions, SizeClass } from './types';
export type * from './types';
/**
 * Returns the window scene's horizontal and vertical UIUserInterfaceSizeClass as live React state.
 * Updated live via native trait change registration on UIWindowScene without polling.
 */
export declare function useSizeClass(): SizeClass;
export declare function getSizeClass(): Promise<SizeClass>;
/**
 * Returns the current hardware hinge state (angle in radians and status) from UIHinge / DeviceHinge.
 */
export declare function useHinge(): HingeState | null;
export declare function getHinge(): Promise<HingeState | null>;
/**
 * Subscribes to hardware hinge changes.
 */
export declare function onHingeChange(callback: (hinge: HingeState | null) => void): () => void;
/**
 * Returns the current reserved regions (e.g. hinge division, occlusion) from UIView.reservedRegions.
 */
export declare function useReservedRegions(kind?: ReservedRegionKind, options?: ReservedRegionOptions): ReservedRegion[];
export declare function getReservedRegions(options?: ReservedRegionOptions): Promise<ReservedRegion[]>;
//# sourceMappingURL=index.native.d.ts.map