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
export declare let routeNode: RouteNode | null;
export declare let rootComponent: ComponentType;
export declare let hasAttemptedToHideSplash: boolean;
export declare let initialState: OneRouter.ResultState | undefined;
export declare let rootState: OneRouter.ResultState | undefined;
export declare let routeInfo: UrlObject | undefined;
export declare let navigationRef: OneRouter.NavigationRef;
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
export declare const preloadingLoader: {};
export declare function preloadRoute(href: string): void;
export declare function linkTo(href: string, event?: string, options?: OneRouter.LinkToOptions): Promise<void>;
//# sourceMappingURL=router.d.ts.map