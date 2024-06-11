import type { EventMapBase, NavigationState, ParamListBase, RouteProp, ScreenListeners } from '@react-navigation/native';
import React from 'react';
import { type RouteNode } from './Route';
export declare const Screen: <RouteName extends string>(_: import("@react-navigation/core").RouteConfig<ParamListBase, RouteName, Readonly<{
    key: string;
    index: number;
    routeNames: string[];
    history?: unknown[] | undefined;
    routes: (Readonly<{
        key: string;
        name: string;
        path?: string | undefined;
    }> & Readonly<{
        params?: Readonly<object | undefined>;
    }> & {
        state?: Readonly<any> | import("@react-navigation/routers").PartialState<Readonly<any>> | undefined;
    })[];
    type: string;
    stale: false;
}>, {}, EventMapBase>) => null, Group: React.ComponentType<import("@react-navigation/core").RouteGroupConfig<ParamListBase, {}>>;
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
export declare function getQualifiedRouteComponent(value: RouteNode): React.ComponentType<any> | React.ForwardRefExoticComponent<Omit<any, "ref"> & React.RefAttributes<unknown>>;
/** @returns a function which provides a screen id that matches the dynamic route name in params. */
export declare function createGetIdForRoute(route: Pick<RouteNode, 'dynamic' | 'route' | 'contextKey' | 'children'>): ({ params }?: {
    params?: Record<string, any> | undefined;
}) => string;
//# sourceMappingURL=useScreens.d.ts.map