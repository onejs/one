import type { ParamListBase, StackNavigationState } from '@react-navigation/native';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
declare const OVERLAY_PRESENTATIONS: readonly ["modal", "transparentModal", "fullScreenModal", "formSheet", "pageSheet", "containedModal", "containedTransparentModal"];
type OverlayPresentation = (typeof OVERLAY_PRESENTATIONS)[number];
type DescriptorMap = Record<string, {
    options: Record<string, any>;
}>;
export declare function isOverlayPresentation(options: NativeStackNavigationOptions | undefined | null): boolean;
export declare function isTransparentOverlay(options: NativeStackNavigationOptions | undefined | null): boolean;
/**
 * Returns the underlying navigation state for NativeStackView with the
 * trailing overlay suffix removed.
 *
 * Important: we only strip the suffix of overlay routes at the top of the
 * stack. Overlay routes that are SANDWICHED between cards (e.g. user
 * navigated forward from a sheet to a card) stay in the underlying state
 * so NativeStackView still has a complete history and downstream routes
 * keep their correct previous-route / header-back context.
 *
 * The `isOverlay` predicate defaults to `isOverlayPresentation`; callers
 * can narrow it (e.g. only routes that actually have a render component
 * configured).
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