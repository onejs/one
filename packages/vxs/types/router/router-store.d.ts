import { type NavigationContainerRefWithCurrent } from '@react-navigation/native';
import { type ComponentType } from 'react';
import { type UrlObject } from '../LocationProvider';
import type { RouteNode } from '../Route';
import type { ResultState } from '../fork/getStateFromPath';
import { type ExpoLinkingOptions } from '../getLinkingConfig';
import type { VXSRouter } from '../interfaces/router';
import type { RequireContext } from '../types';
/**
 * This is the global state for the router. It is used to keep track of the current route, and to provide a way to navigate to other routes.
 *
 * There should only be one instance of this class and be initialized via `useInitializeVXSRouter`
 */
export declare class RouterStore {
    routeNode: RouteNode | null;
    rootComponent: ComponentType;
    linking?: ExpoLinkingOptions;
    private hasAttemptedToHideSplash;
    initialState?: ResultState;
    rootState?: ResultState;
    nextState?: ResultState;
    routeInfo?: UrlObject;
    splashScreenAnimationFrame?: number;
    navigationRef: VXSRouter.NavigationRef;
    navigationRefSubscription: () => void;
    linkTo: (href: string, event?: string | undefined) => void;
    rootStateSubscribers: Set<() => void>;
    storeSubscribers: Set<() => void>;
    initialize(context: RequireContext, navigationRef: NavigationContainerRefWithCurrent<ReactNavigation.RootParamList>, initialLocation?: URL): void;
    navigate: (url: VXSRouter.Href) => void;
    push: (url: VXSRouter.Href) => void;
    dismiss: (count?: number) => void;
    replace: (url: VXSRouter.Href) => void;
    setParams: (params?: Record<string, string | number>) => any;
    dismissAll: () => void;
    goBack: () => void;
    canGoBack: () => boolean;
    canDismiss: () => boolean;
    getSortedRoutes: () => RouteNode[];
    updateState: (state: ResultState, nextState?: ResultState) => void;
    getRouteInfo(state: ResultState): UrlObject;
    shouldShowTutorial(): boolean;
    /** Make sure these are arrow functions so `this` is correctly bound */
    subscribeToRootState: (subscriber: () => void) => () => boolean;
    subscribeToStore: (subscriber: () => void) => () => boolean;
    snapshot: () => this;
    rootStateSnapshot: () => ResultState;
    routeInfoSnapshot: () => UrlObject;
    cleanup(): void;
}
export declare const store: RouterStore;
export declare function useVXSRouter(): RouterStore;
export declare function useStoreRootState(): ResultState;
export declare function useStoreRouteInfo(): UrlObject;
//# sourceMappingURL=router-store.d.ts.map