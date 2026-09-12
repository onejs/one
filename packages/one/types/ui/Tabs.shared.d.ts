import { type DefaultNavigatorOptions, type ParamListBase, type TabActionHelpers, type TabNavigationState, type TabRouterOptions } from '@react-navigation/native';
import { type PropsWithChildren } from 'react';
import type { ViewProps } from 'react-native';
import { type ScreenTrigger } from './common';
import { type ExpoTabsScreenOptions, type TabNavigationEventMap, type TabsContextValue } from './TabContext';
export type UseTabsOptions = Omit<DefaultNavigatorOptions<ParamListBase, TabNavigationState<any>, ExpoTabsScreenOptions, TabNavigationEventMap, any>, 'children'> & {
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
        }] : never): void;
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
    } & import("@react-navigation/core").EventEmitter<TabNavigationEventMap> & {
        setParams(params: Partial<object | undefined>): void;
        replaceParams(params: object | undefined): void;
        pushParams(params: object | undefined): void;
    } & import("@react-navigation/core").PrivateValueStore<[ParamListBase, unknown, unknown, unknown]> & TabActionHelpers<ParamListBase>;
    descriptors: Record<string, import("@react-navigation/core").Descriptor<import("./TabContext").ExpoTabsNavigatorScreenOptions, import("@react-navigation/core").NavigationProp<ParamListBase, string, TabNavigationState<any>, import("./TabContext").ExpoTabsNavigatorScreenOptions, TabNavigationEventMap, TabActionHelpers<ParamListBase>>, Readonly<{
        key: string;
        name: string;
        path?: string | undefined;
        history?: {
            type: "params";
            params: Readonly<object | undefined>;
        }[] | undefined;
    } & {
        params?: Readonly<object | undefined>;
    }>>>;
    NavigationContent: ({ children }: {
        children: React.ReactNode;
    }) => React.JSX.Element;
};
export declare function useTabsWithTriggers(options: UseTabsWithTriggersOptions): TabsContextValue;
//# sourceMappingURL=Tabs.shared.d.ts.map