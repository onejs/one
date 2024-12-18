import type { EventMapBase, NavigationState, ParamListBase, RouteProp, ScreenListeners } from '@react-navigation/native';
import React from 'react';
import { type RouteNode } from './Route';
export declare const Screen: <RouteName extends string | number | symbol>(_: import("@react-navigation/core").RouteConfig<Record<string, object | undefined>, RouteName, Readonly<{
    key: string;
    index: number;
    routeNames: Extract<keyof ParamList, string>[];
    history?: unknown[];
    routes: any[];
    type: string;
    stale: false;
}>, {}, Record<string, {
    data?: any;
    canPreventDefault?: boolean;
}>>) => null, Group: React.ComponentType<import("@react-navigation/core").RouteGroupConfig<Record<string, object | undefined>, {}>>;
export type ScreenProps<TOptions extends Record<string, any> = Record<string, any>, State extends NavigationState = NavigationState, EventMap extends EventMapBase = EventMapBase> = {
    /** Name is required when used inside a Layout component. */
    name?: string;
    /**
     * Redirect to the nearest sibling route.
     * If all children are redirect={true}, the layout will render `null` as there are no children to render.
     */
    redirect?: boolean;
    initialParams?: Record<string, any>;
    options?: TOptions;
    listeners?: ScreenListeners<State, EventMap> | ((prop: {
        route: RouteProp<ParamListBase, string>;
        navigation: any;
    }) => ScreenListeners<State, EventMap>);
    getId?: ({ params }: {
        params?: Record<string, any>;
    }) => string | undefined;
};
/**
 * @returns React Navigation screens sorted by the `route` property.
 */
export declare function useSortedScreens(order: ScreenProps[]): React.ReactNode[];
/** Wrap the component with various enhancements and add access to child routes. */
export declare function getQualifiedRouteComponent(value: RouteNode): any;
/** @returns a function which provides a screen id that matches the dynamic route name in params. */
export declare function createGetIdForRoute(route: Pick<RouteNode, 'dynamic' | 'route' | 'contextKey' | 'children'>): ({ params }?: {
    params?: Record<string, any>;
}) => any;
//# sourceMappingURL=useScreens.d.ts.map