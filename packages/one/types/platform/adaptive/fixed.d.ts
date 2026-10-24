import type { HingeState, SizeClass } from './types';
export declare function useSizeClass(): SizeClass;
export declare function getSizeClass(): Promise<SizeClass>;
export declare function useHinge(): HingeState | null;
export declare function getHinge(): Promise<HingeState | null>;
export declare function onHingeChange(_callback: (hinge: HingeState | null) => void): () => void;
//# sourceMappingURL=fixed.d.ts.map