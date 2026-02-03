import type { RouteNode } from './Route';
export declare function setNavigationType(type: 'soft' | 'hard'): void;
export declare function getNavigationType(): 'soft' | 'hard';
export declare function isHardNavigation(): boolean;
export declare function isSoftNavigation(): boolean;
export interface InterceptResult {
    /** The intercept route that matched */
    interceptRoute: RouteNode;
    /** The slot name this intercept belongs to */
    slotName: string;
    /** The layout's contextKey that owns this slot (for scoped state) */
    layoutContextKey: string;
    /** Params extracted from the target path */
    params: Record<string, string>;
}
/**
 * Find an intercept route that matches the target path.
 * Checks all layouts with slots along the current path (supports nested intercepts).
 *
 * Returns null if:
 * - Navigation is "hard" (direct URL, refresh)
 * - No intercept route matches the target path
 * - No layouts with slots found along current path
 *
 * @param targetPath - The path being navigated to (e.g., "/photos/5")
 * @param rootNode - The root layout node to start traversal from
 * @param currentPath - The current path before navigation (for relative matching)
 */
export declare function findInterceptRoute(targetPath: string, rootNode: RouteNode | null, currentPath: string): InterceptResult | null;
/**
 * Update the browser URL without triggering a full navigation.
 * Used when activating an intercept route to show the target URL.
 */
export declare function updateURLWithoutNavigation(href: string): void;
export declare function registerClearSlotStates(callback: () => void): void;
/**
 * Close the current intercept and restore the previous URL.
 * This should be called from modal close handlers instead of router.back().
 */
export declare function closeIntercept(): boolean;
/**
 * Check if the current navigation state is from an interception
 */
export declare function isInterceptedNavigation(): boolean;
/**
 * Get the actual path from an intercepted navigation
 */
export declare function getInterceptedActualPath(): string | null;
/**
 * Get the URL from before the interception
 */
export declare function getPreInterceptUrl(): string | null;
export declare function setReturningFromIntercept(value: boolean): void;
export declare function isReturningFromIntercept(): boolean;
declare let setSlotStateCallback: ((slotName: string, state: {
    activeRouteKey: string | null;
    activeRouteNode?: any;
    params?: Record<string, string>;
    isIntercepted: boolean;
} | null) => void) | null;
export declare function registerSetSlotState(callback: typeof setSlotStateCallback): void;
export declare function storeInterceptState(slotName: string, routeNode: any, params: Record<string, string>): void;
/**
 * Try to restore an intercept from browser history state (forward navigation).
 * Returns true if an intercept was restored, false otherwise.
 */
export declare function restoreInterceptFromHistory(): boolean;
export {};
//# sourceMappingURL=interceptRoutes.d.ts.map