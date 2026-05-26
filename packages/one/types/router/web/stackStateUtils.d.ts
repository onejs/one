import type { ParamListBase, StackNavigationState } from '@react-navigation/native';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
declare const OVERLAY_PRESENTATIONS: readonly ["modal", "transparentModal", "fullScreenModal", "formSheet", "pageSheet", "containedModal", "containedTransparentModal"];
type OverlayPresentation = (typeof OVERLAY_PRESENTATIONS)[number];
type DescriptorMap = Record<string, {
    options: NativeStackNavigationOptions;
}>;
export declare function isOverlayPresentation(options: NativeStackNavigationOptions | undefined | null): boolean;
export declare function isTransparentOverlay(options: NativeStackNavigationOptions | undefined | null): boolean;
/**
 * Returns a copy of the navigation state with overlay routes stripped so the
 * underlying NativeStackView never tries to render a screen that is being
 * shown in an overlay slot. The index is recalculated to still point at the
 * currently-active non-overlay route (or the last remaining route if the
 * active one was an overlay).
 *
 * The `isOverlay` predicate decides which routes to peel off. Defaults to
 * `isOverlayPresentation`; callers can narrow it (e.g. only routes that
 * actually have a render component configured).
 */
export declare function convertStackStateToNonOverlayState(state: StackNavigationState<ParamListBase>, descriptors: DescriptorMap, isOverlay?: (options: NativeStackNavigationOptions | undefined | null) => boolean): {
    routes: typeof state.routes;
    index: number;
};
/**
 * Index of the last route that is NOT an overlay. Returns -1 if every route
 * is an overlay. Accepts the same predicate as
 * `convertStackStateToNonOverlayState`.
 */
export declare function findLastNonOverlayIndex(state: StackNavigationState<ParamListBase>, descriptors: DescriptorMap, isOverlay?: (options: NativeStackNavigationOptions | undefined | null) => boolean): number;
export type { OverlayPresentation };
//# sourceMappingURL=stackStateUtils.d.ts.map