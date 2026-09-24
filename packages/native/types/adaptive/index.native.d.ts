import type { HingeState, SizeClass } from './types';
import * as ReservedRegions from './ReservedRegions.native';
export type * from './types';
export { ReservedRegions };
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
//# sourceMappingURL=index.native.d.ts.map