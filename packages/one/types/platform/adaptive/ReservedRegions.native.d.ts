import type { ReservedRegionsProviderProps } from './types';
export { useReady, useRegions, useSegments, useSpanning } from './reservedRegionsContext';
/**
 * A view that reports the regions reserved inside its own bounds (iOS 27.1
 * UIView reservedRegions, Android folding features and display cutouts) to
 * the hooks below it.
 */
export declare function Provider({ children, onLayout, ...props }: ReservedRegionsProviderProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=ReservedRegions.native.d.ts.map