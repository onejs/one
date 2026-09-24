import type { HingeState, SizeClass } from './types';
import * as ReservedRegions from './ReservedRegions';
export type * from './types';
export { ReservedRegions };
export declare function useSizeClass(): SizeClass;
export declare function getSizeClass(): Promise<SizeClass>;
export declare function useHinge(): HingeState | null;
export declare function getHinge(): Promise<HingeState | null>;
export declare function onHingeChange(_callback: (hinge: HingeState | null) => void): () => void;
//# sourceMappingURL=index.d.ts.map