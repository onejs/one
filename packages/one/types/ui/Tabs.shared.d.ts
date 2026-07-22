import { type DefaultNavigatorOptions, type ParamListBase, type TabActionHelpers, type TabNavigationState, type TabRouterOptions } from '@react-navigation/native';
import { type PropsWithChildren } from 'react';
import type { ViewProps } from 'react-native';
import { type ScreenTrigger } from './common';
import { type ExpoTabsScreenOptions, type TabNavigationEventMap, type TabsContextValue } from './TabContext';
export type UseTabsOptions = Omit<DefaultNavigatorOptions<ParamListBase, any, TabNavigationState<any>, ExpoTabsScreenOptions, TabNavigationEventMap, any>, 'children'> & {
    backBehavior?: TabRouterOptions['backBehavior'];
};
export type TabsProps = ViewProps & {
    asChild?: boolean;
    options?: UseTabsOptions;
};
export type UseTabsWithChildrenOptions = PropsWithChildren<UseTabsOptions>;
export type UseTabsWithTriggersOptions = UseTabsOptions & {
    triggers: ScreenTrigger[];
};
export declare function useTabsWithChildren(options: UseTabsWithChildrenOptions): {
    state: TabNavigationState<any>;
    navigation: {
        dispatch(action: Readonly<{
            type: string;
            payload?: object;
            source?: string;
            target?: string;
        }> | ((state: Readonly<Readonly<{
            key: string;
            index: number;
            routeNames: string[];
            history?: unknown[];
            routes: import("@react-navigation/routers").NavigationRoute<ParamListBase, string>[];
            type: string;
            stale: false;
        }>>) => Readonly<{
            type: string;
            payload?: object;
            source?: string;
            target?: string;
        }>)): void;
        navigate<RouteName extends string>(...args: RouteName extends unknown ? [screen: RouteName, params?: object | undefined, options?: {
            merge?: boolean;
            pop?: boolean;
        } | undefined] : never): void;
        navigate<RouteName extends string>(options: RouteName extends unknown ? {
            name: RouteName;
            params: object | undefined;
            path?: string;
            merge?: boolean;
            pop?: boolean;
        } : never): void;
        navigateDeprecated<RouteName extends string>(...args: RouteName extends unknown ? [screen: RouteName, params?: object | undefined] : never): void;
        navigateDeprecated<RouteName extends string>(options: RouteName extends unknown ? {
            name: RouteName;
            params: object | undefined;
            merge?: boolean;
        } : never): void;
        preload<RouteName extends string>(...args: RouteName extends unknown ? [screen: RouteName, params?: object | undefined] : never): void;
        reset(state: Readonly<{
            key: string;
            index: number;
            routeNames: string[];
            history?: unknown[];
            routes: import("@react-navigation/routers").NavigationRoute<ParamListBase, string>[];
            type: string;
            stale: false;
        }> | import("@react-navigation/routers").PartialState<Readonly<{
            key: string;
            index: number;
            routeNames: string[];
            history?: unknown[];
            routes: import("@react-navigation/routers").NavigationRoute<ParamListBase, string>[];
            type: string;
            stale: false;
        }>>): void;
        goBack(): void;
        isFocused(): boolean;
        canGoBack(): boolean;
        getId(): string | undefined;
        getParent<T = import("@react-navigation/core").NavigationHelpers<ParamListBase, {}> | undefined>(id?: string): T;
        getState(): Readonly<{
            key: string;
            index: number;
            routeNames: string[];
            history?: unknown[];
            routes: import("@react-navigation/routers").NavigationRoute<ParamListBase, string>[];
            type: string;
            stale: false;
        }>;
    } & import("@react-navigation/core").PrivateValueStore<[ParamListBase, unknown, unknown]> & import("@react-navigation/core").EventEmitter<TabNavigationEventMap> & {
        setParams(params: Partial<object | undefined>): void;
        replaceParams(params: object | undefined): void;
    } & TabActionHelpers<ParamListBase>;
    describe: (route: import("@react-navigation/core").RouteProp<ParamListBase>, placeholder: boolean) => import("@react-navigation/core").Descriptor<import("./TabContext").ExpoTabsNavigatorScreenOptions, Omit<{
        dispatch(action: Readonly<{
            type: string;
            payload?: object;
            source?: string;
            target?: string;
        }> | ((state: Readonly<TabNavigationState<any>>) => Readonly<{
            type: string;
            payload?: object;
            source?: string;
            target?: string;
        }>)): void;
        navigate<RouteName extends string>(...args: RouteName extends unknown ? [screen: RouteName, params?: object | undefined, options?: {
            merge?: boolean;
            pop?: boolean;
        } | undefined] : never): void;
        navigate<RouteName extends string>(options: RouteName extends unknown ? {
            name: RouteName;
            params: object | undefined;
            path?: string;
            merge?: boolean;
            pop?: boolean;
        } : never): void;
        navigateDeprecated<RouteName extends string>(...args: RouteName extends unknown ? [screen: RouteName, params?: object | undefined] : never): void;
        navigateDeprecated<RouteName extends string>(options: RouteName extends unknown ? {
            name: RouteName;
            params: object | undefined;
            merge?: boolean;
        } : never): void;
        preload<RouteName extends string>(...args: RouteName extends unknown ? [screen: RouteName, params?: object | undefined] : never): void;
        reset(state: TabNavigationState<any> | import("@react-navigation/routers").PartialState<TabNavigationState<any>>): void;
        goBack(): void;
        isFocused(): boolean;
        canGoBack(): boolean;
        getId(): string | undefined;
        getParent<T = import("@react-navigation/core").NavigationHelpers<ParamListBase, {}> | undefined>(id?: string): T;
        getState(): TabNavigationState<any>;
    } & import("@react-navigation/core").PrivateValueStore<[ParamListBase, unknown, unknown]>, "getParent"> & {
        getParent<T = import("@react-navigation/core").NavigationProp<ParamListBase, string, string | undefined, Readonly<{
            key: string;
            index: number;
            routeNames: string[];
            history?: unknown[];
            routes: import("@react-navigation/routers").NavigationRoute<ParamListBase, string>[];
            type: string;
            stale: false;
        }>, {}, {}> | undefined>(id?: string | undefined): T;
        setOptions(options: Partial<import("./TabContext").ExpoTabsNavigatorScreenOptions>): void;
    } & {
        setParams(params: Partial<object | undefined>): void;
        replaceParams(params: object | undefined): void;
    } & import("@react-navigation/core").EventConsumer<TabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<any>>> & import("@react-navigation/core").PrivateValueStore<[ParamListBase, string, TabNavigationEventMap]> & TabActionHelpers<ParamListBase>, import("@react-navigation/core").RouteProp<ParamListBase, string>>;
    descriptors: Record<string, import("@react-navigation/core").Descriptor<import("./TabContext").ExpoTabsNavigatorScreenOptions, Omit<{
        dispatch(action: Readonly<{
            type: string;
            payload?: object;
            source?: string;
            target?: string;
        }> | ((state: Readonly<TabNavigationState<any>>) => Readonly<{
            type: string;
            payload?: object;
            source?: string;
            target?: string;
        }>)): void;
        navigate<RouteName extends string>(...args: RouteName extends unknown ? [screen: RouteName, params?: object | undefined, options?: {
            merge?: boolean;
            pop?: boolean;
        } | undefined] : never): void;
        navigate<RouteName extends string>(options: RouteName extends unknown ? {
            name: RouteName;
            params: object | undefined;
            path?: string;
            merge?: boolean;
            pop?: boolean;
        } : never): void;
        navigateDeprecated<RouteName extends string>(...args: RouteName extends unknown ? [screen: RouteName, params?: object | undefined] : never): void;
        navigateDeprecated<RouteName extends string>(options: RouteName extends unknown ? {
            name: RouteName;
            params: object | undefined;
            merge?: boolean;
        } : never): void;
        preload<RouteName extends string>(...args: RouteName extends unknown ? [screen: RouteName, params?: object | undefined] : never): void;
        reset(state: TabNavigationState<any> | import("@react-navigation/routers").PartialState<TabNavigationState<any>>): void;
        goBack(): void;
        isFocused(): boolean;
        canGoBack(): boolean;
        getId(): string | undefined;
        getParent<T = import("@react-navigation/core").NavigationHelpers<ParamListBase, {}> | undefined>(id?: string): T;
        getState(): TabNavigationState<any>;
    } & import("@react-navigation/core").PrivateValueStore<[ParamListBase, unknown, unknown]>, "getParent"> & {
        getParent<T = import("@react-navigation/core").NavigationProp<ParamListBase, string, string | undefined, Readonly<{
            key: string;
            index: number;
            routeNames: string[];
            history?: unknown[];
            routes: import("@react-navigation/routers").NavigationRoute<ParamListBase, string>[];
            type: string;
            stale: false;
        }>, {}, {}> | undefined>(id?: string | undefined): T;
        setOptions(options: Partial<import("./TabContext").ExpoTabsNavigatorScreenOptions>): void;
    } & {
        setParams(params: Partial<object | undefined>): void;
        replaceParams(params: object | undefined): void;
    } & import("@react-navigation/core").EventConsumer<TabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<any>>> & import("@react-navigation/core").PrivateValueStore<[ParamListBase, string, TabNavigationEventMap]> & TabActionHelpers<ParamListBase>, import("@react-navigation/core").RouteProp<ParamListBase, string>>>;
    NavigationContent: ({ children }: {
        children: React.ReactNode;
    }) => import("react/jsx-runtime").JSX.Element;
};
export declare function useTabsWithTriggers(options: UseTabsWithTriggersOptions): TabsContextValue;
//# sourceMappingURL=Tabs.shared.d.ts.map