import type { HingeState, ReservedRegion, ReservedRegionKind, ReservedRegionOptions, SizeClass } from './types';
export type * from './types';
export declare function useSizeClass(): SizeClass;
export declare function getSizeClass(): Promise<SizeClass>;
export declare function useHinge(): HingeState | null;
export declare function getHinge(): Promise<HingeState | null>;
export declare function onHingeChange(_callback: (hinge: HingeState | null) => void): () => void;
export declare function useReservedRegions(_kind?: ReservedRegionKind, _options?: ReservedRegionOptions): ReservedRegion[];
export declare function getReservedRegions(_options?: ReservedRegionOptions): Promise<ReservedRegion[]>;
//# sourceMappingURL=index.d.ts.map