/**
 * Note: this entire module is exported as an interface router.*
 * We need to treat exports as an API and not change them, maybe not
 * the best decision.
 */
import { type NavigationContainerRefWithCurrent } from '@react-navigation/native';
import { type ComponentType } from 'react';
import type { OneRouter } from '../interfaces/router';
import type { One } from '../vite/types';
import type { UrlObject } from './getNormalizedStatePath';
import type { RouteNode } from './Route';
import type { RouteMatch } from '../useMatches';
import { type RouteMask } from './routeMask';
export declare let routeNode: RouteNode | null;
export declare let rootComponent: ComponentType;
/**
 * Set route masks for automatic URL masking during navigation.
 * Route masks transform URLs displayed in the browser without changing the actual route.
 *
 * @example
 * ```tsx
 * import { setRouteMasks, createRouteMask } from 'one'
 *
 * setRouteMasks([
 *   createRouteMask({
 *     from: '/photos/[id]/modal',
 *     to: '/photos/[id]',
 *     unmaskOnReload: true,
 *   }),
 * ])
 * ```
 */
export declare function setRouteMasks(masks: RouteMask[]): void;
/**
 * Get the current route masks.
 */
export declare function getRouteMasks(): RouteMask[];
/**
 * Register protected routes for a navigator context.
 * Called by navigators when their protectedScreens changes.
 */
export declare function registerProtectedRoutes(contextKey: string, protectedScreens: Set<string>): void;
/**
 * Unregister protected routes for a navigator context.
 * Called when a navigator unmounts.
 */
export declare function unregisterProtectedRoutes(contextKey: string): void;
/**
 * Check if a route path is protected and should be blocked.
 * Returns true if the route is protected.
 */
export declare function isRouteProtected(href: string): boolean;
export declare let hasAttemptedToHideSplash: boolean;
export declare let initialState: OneRouter.ResultState | undefined;
export declare let rootState: OneRouter.ResultState | undefined;
export declare let routeInfo: UrlObject | undefined;
export declare let navigationRef: OneRouter.NavigationRef;
export type ValidationState = {
    status: 'idle' | 'validating' | 'error' | 'valid';
    error?: Error;
    lastValidatedHref?: string;
};
export declare function subscribeToValidationState(subscriber: (state: ValidationState) => void): () => boolean;
export declare function setValidationState(state: ValidationState): void;
export declare function getValidationState(): ValidationState;
export declare function useValidationState(): ValidationState;
export declare function initialize(context: One.RouteContext, ref: NavigationContainerRefWithCurrent<ReactNavigation.RootParamList>, initialLocation?: URL): void;
export declare function navigate(url: OneRouter.Href, options?: OneRouter.LinkToOptions): Promise<void>;
export declare function push(url: OneRouter.Href, options?: OneRouter.LinkToOptions): Promise<void>;
export declare function dismiss(count?: number): void;
export declare function replace(url: OneRouter.Href, options?: OneRouter.LinkToOptions): Promise<void>;
export declare function setParams(params?: OneRouter.InpurRouteParamsGeneric): void | undefined;
export declare function dismissAll(): void;
export declare function goBack(): void;
export declare function canGoBack(): boolean;
export declare function canDismiss(): boolean;
export declare function getSortedRoutes(): RouteNode[];
export declare function updateState(state: OneRouter.ResultState, nextStateParam?: OneRouter.ResultState): void;
export declare function subscribeToRootState(subscriber: OneRouter.RootStateListener): () => void;
export declare function subscribeToStore(subscriber: () => void): () => void;
export declare function subscribeToLoadingState(subscriber: OneRouter.LoadingStateListener): () => void;
export declare function setLoadingState(state: OneRouter.LoadingState): void;
export declare function snapshot(): {
    linkTo: typeof linkTo;
    routeNode: RouteNode | null;
    rootComponent: ComponentType;
    linking: import("./getLinkingConfig").OneLinkingOptions | undefined;
    hasAttemptedToHideSplash: boolean;
    initialState: OneRouter.ResultState | undefined;
    rootState: OneRouter.ResultState | undefined;
    nextState: OneRouter.ResultState | undefined;
    routeInfo: UrlObject | undefined;
    splashScreenAnimationFrame: number | undefined;
    navigationRef: OneRouter.NavigationRef;
    navigationRefSubscription: () => void;
    rootStateSubscribers: Set<OneRouter.RootStateListener>;
    storeSubscribers: Set<() => void>;
};
export declare function rootStateSnapshot(): OneRouter.ResultState;
export declare function routeInfoSnapshot(): UrlObject;
export declare function useOneRouter(): {
    linkTo: typeof linkTo;
    routeNode: RouteNode | null;
    rootComponent: ComponentType;
    linking: import("./getLinkingConfig").OneLinkingOptions | undefined;
    hasAttemptedToHideSplash: boolean;
    initialState: OneRouter.ResultState | undefined;
    rootState: OneRouter.ResultState | undefined;
    nextState: OneRouter.ResultState | undefined;
    routeInfo: UrlObject | undefined;
    splashScreenAnimationFrame: number | undefined;
    navigationRef: OneRouter.NavigationRef;
    navigationRefSubscription: () => void;
    rootStateSubscribers: Set<OneRouter.RootStateListener>;
    storeSubscribers: Set<() => void>;
};
export declare function useStoreRootState(): OneRouter.ResultState;
export declare function useStoreRouteInfo(): UrlObject;
export declare function cleanup(): void;
export declare const preloadingLoader: Record<string, Promise<any> | undefined>;
export declare const preloadedLoaderData: Record<string, any>;
export type PreloadStatus = 'pending' | 'loading' | 'loaded' | 'error';
export type PreloadEntry = {
    href: string;
    status: PreloadStatus;
    startTime: number;
    endTime?: number;
    error?: string;
    hasLoader: boolean;
    hasCss: boolean;
};
export declare function getPreloadHistory(): PreloadEntry[];
export declare function preloadRoute(href: string, injectCSS?: boolean): Promise<any> | undefined;
/**
 * Initialize client matches from server context during hydration.
 * Called from createApp when hydrating.
 */
export declare function initClientMatches(matches: RouteMatch[]): void;
export declare function linkTo(href: string, event?: string, options?: OneRouter.LinkToOptions): Promise<void>;
//# sourceMappingURL=router.d.ts.map