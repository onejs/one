import type { ReservedRegion, ReservedRegionOptions, WindowSegment } from './types';
export interface ReservedRegionsSnapshot {
    regions: readonly ReservedRegion[];
    ready: boolean;
    bounds: {
        width: number;
        height: number;
    } | null;
}
export declare const ReservedRegionsContext: import("react").Context<ReservedRegionsSnapshot | null>;
/**
 * The regions reserved inside the nearest ReservedRegions.Provider, in its
 * coordinates: a `division` (a fold content should not straddle) or an
 * `occlusion` (a camera or system control hiding content). Active regions
 * only unless `includeInactive` is set.
 */
export declare function useRegions(options?: ReservedRegionOptions): readonly ReservedRegion[];
/**
 * Whether the nearest provider has taken its first reading, an empty one
 * included. It stays true for the provider's lifetime.
 */
export declare function useReady(): boolean;
/**
 * parts of the provider separated by an active full-span division. Put the
 * provider around the full window to read window segments. Until its native
 * regions and bounds arrive, the result is empty. An unspanned window has one
 * segment. Occlusions do not divide a window.
 */
export declare function useSegments(): readonly WindowSegment[];
/** whether an active division spans the provider. */
export declare function useSpanning(): boolean;
export declare function segmentsFor(bounds: {
    width: number;
    height: number;
}, regions: readonly ReservedRegion[]): WindowSegment[];
//# sourceMappingURL=reservedRegionsContext.d.ts.map
