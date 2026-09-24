import type { ReservedRegion, ReservedRegionOptions } from './types';
export interface ReservedRegionsSnapshot {
    regions: readonly ReservedRegion[];
    ready: boolean;
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
//# sourceMappingURL=reservedRegionsContext.d.ts.map