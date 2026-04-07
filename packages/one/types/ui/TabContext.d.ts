import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import type { DefaultNavigatorOptions, NavigationAction, NavigationProp, ParamListBase, TabActionHelpers, TabNavigationState, TabRouterOptions, useNavigationBuilder } from '@react-navigation/native';
import type { TriggerMap } from './common';
export type ExpoTabsProps = ExpoTabsNavigatorOptions;
export type ExpoTabsNavigatorScreenOptions = {
    detachInactiveScreens?: boolean;
    unmountOnBlur?: boolean;
    freezeOnBlur?: boolean;
    lazy?: boolean;
};
export type ExpoTabsNavigatorOptions = DefaultNavigatorOptions<ParamListBase, TabNavigationState<ParamListBase>, ExpoTabsScreenOptions, TabNavigationEventMap, ExpoTabsNavigationProp<ParamListBase>> & Omit<TabRouterOptions, 'initialRouteName'> & ExpoTabsNavigatorScreenOptions;
export type ExpoTabsNavigationProp<ParamList extends ParamListBase, RouteName extends keyof ParamList = keyof ParamList> = NavigationProp<ParamList, RouteName, TabNavigationState<ParamListBase>, ExpoTabsScreenOptions, TabNavigationEventMap>;
export type ExpoTabsScreenOptions = Pick<BottomTabNavigationOptions, 'title' | 'lazy'> & {
    freezeOnBlur?: boolean;
    params?: object;
    title: string;
    action: NavigationAction;
};
export type TabNavigationEventMap = {
    /**
     * Event which fires on tapping on the tab in the tab bar.
     */
    tabPress: {
        data: undefined;
        canPreventDefault: true;
    };
    /**
     * Event which fires on long press on the tab in the tab bar.
     */
    tabLongPress: {
        data: undefined;
    };
};
/**
 * The React Navigation custom navigator.
 *
 * @see [`useNavigationBuilder`](https://reactnavigation.org/docs/custom-navigators/#usenavigationbuilder) hook from React Navigation for more information.
 */
export type TabsContextValue = ReturnType<typeof useNavigationBuilder<TabNavigationState<any>, TabRouterOptions, TabActionHelpers<ParamListBase>, ExpoTabsNavigatorScreenOptions, TabNavigationEventMap>>;
export type TabContextValue = TabsDescriptor['options'];
export declare const TabContext: import("react").Context<ExpoTabsNavigatorScreenOptions>;
/**
 * @hidden
 */
export declare const TabTriggerMapContext: import("react").Context<TriggerMap>;
/**
 * @hidden
 */
export declare const TabsDescriptorsContext: import("react").Context<Record<string, import("@react-navigation/core").Descriptor<ExpoTabsNavigatorScreenOptions, NavigationProp<ParamListBase, string, TabNavigationState<any>, ExpoTabsNavigatorScreenOptions, TabNavigationEventMap, TabActionHelpers<ParamListBase>>, Readonly<{
    key: string;
    name: string;
    path?: string | undefined;
    history?: {
        type: "params";
        params: object;
    }[] | undefined;
} & Readonly<{
    params?: Readonly<object | undefined>;
}>>>>>;
/**
 * @hidden
 */
export declare const TabsNavigatorContext: import("react").Context<({
    dispatch(action: Readonly<{
        type: string;
        payload?: object | undefined;
        source?: string | undefined;
        target?: string | undefined;
    }> | ((state: Readonly<Readonly<{
        key: string;
        index: number;
        routeNames: string[];
        history?: unknown[] | undefined;
        routes: import("@react-navigation/routers").NavigationRoute<ParamListBase, string>[];
        type: string;
        stale: false;
    }>>) => Readonly<{
        type: string;
        payload?: object | undefined;
        source?: string | undefined;
        target?: string | undefined;
    }>)): void;
    navigate<RouteName extends string>(...args: RouteName extends unknown ? [screen: RouteName, params?: object | undefined, options?: {
        merge?: boolean | undefined;
        pop?: boolean | undefined;
    } | undefined] : never): void;
    navigate<RouteName extends string>(options: RouteName extends unknown ? {
        name: RouteName;
        params: object | undefined;
        path?: string | undefined;
        merge?: boolean | undefined;
        pop?: boolean | undefined;
    } : never): void;
    preload<RouteName extends string>(...args: RouteName extends unknown ? [screen: RouteName, params?: object | undefined] : never): void;
    reset(state: Readonly<{
        key: string;
        index: number;
        routeNames: string[];
        history?: unknown[] | undefined;
        routes: import("@react-navigation/routers").NavigationRoute<ParamListBase, string>[];
        type: string;
        stale: false;
    }> | import("@react-navigation/routers").PartialState<Readonly<{
        key: string;
        index: number;
        routeNames: string[];
        history?: unknown[] | undefined;
        routes: import("@react-navigation/routers").NavigationRoute<ParamListBase, string>[];
        type: string;
        stale: false;
    }>>): void;
    goBack(): void;
    isFocused(): boolean;
    canGoBack(): boolean;
    getState(): Readonly<{
        key: string;
        index: number;
        routeNames: string[];
        history?: unknown[] | undefined;
        routes: import("@react-navigation/routers").NavigationRoute<ParamListBase, string>[];
        type: string;
        stale: false;
    }>;
} & import("@react-navigation/core").PrivateValueStore<[ParamListBase, unknown, unknown]> & import("@react-navigation/core").EventEmitter<TabNavigationEventMap> & {
    setParams(params: Partial<object | undefined>): void;
    replaceParams(params: object | undefined): void;
    pushParams(params: object | undefined): void;
} & TabActionHelpers<ParamListBase>) | null>;
/**
 * @hidden
 */
export declare const TabsStateContext: import("react").Context<TabNavigationState<any>>;
export type Route = TabNavigationState<ParamListBase>['routes'][number];
export type TabsDescriptor = TabsContextValue['descriptors'][number];
//# sourceMappingURL=TabContext.d.ts.map