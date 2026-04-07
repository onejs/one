import { type DefaultNavigatorOptions, type ParamListBase, type TabActionHelpers, type TabNavigationState, type TabRouterOptions } from '@react-navigation/native';
import { type PropsWithChildren } from 'react';
import { type ViewProps } from 'react-native';
import { type ScreenTrigger } from './common';
import { type ExpoTabsScreenOptions, type TabNavigationEventMap, type TabsContextValue } from './TabContext';
export * from './TabContext';
export * from './TabList';
export * from './TabSlot';
export * from './TabTrigger';
/**
 * Options to provide to the Tab Router.
 */
export type UseTabsOptions = Omit<DefaultNavigatorOptions<ParamListBase, TabNavigationState<any>, ExpoTabsScreenOptions, TabNavigationEventMap, any>, 'children'> & {
    backBehavior?: TabRouterOptions['backBehavior'];
};
export type TabsProps = ViewProps & {
    /** Forward props to child component and removes the extra `<View>`. Useful for custom wrappers. */
    asChild?: boolean;
    options?: UseTabsOptions;
};
/**
 * Root component for the headless tabs.
 *
 * @see [`useTabsWithChildren`](#usetabswithchildrenoptions) for a hook version of this component.
 * @example
 * ```tsx
 * <Tabs>
 *  <TabSlot />
 *  <TabList>
 *   <TabTrigger name="home" href="/" />
 *  </TabList>
 * </Tabs>
 * ```
 */
export declare function Tabs(props: TabsProps): import("react/jsx-runtime").JSX.Element;
export type UseTabsWithChildrenOptions = PropsWithChildren<UseTabsOptions>;
export type UseTabsWithTriggersOptions = UseTabsOptions & {
    triggers: ScreenTrigger[];
};
/**
 * Hook version of `Tabs`. The returned NavigationContent component
 * should be rendered. Using the hook requires using the `<TabList />`
 * and `<TabTrigger />` components exported from One.
 *
 * The `useTabsWithTriggers()` hook can be used for custom components.
 *
 * @see [`Tabs`](#tabs) for the component version of this hook.
 * @example
 * ```tsx
 * export function MyTabs({ children }) {
 *  const { NavigationContent } = useTabsWithChildren({ children })
 *
 *  return <NavigationContent />
 * }
 * ```
 */
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
            history
            /**
             * Hook version of `Tabs`. The returned NavigationContent component
             * should be rendered. Using the hook requires using the `<TabList />`
             * and `<TabTrigger />` components exported from One.
             *
             * The `useTabsWithTriggers()` hook can be used for custom components.
             *
             * @see [`Tabs`](#tabs) for the component version of this hook.
             * @example
             * ```tsx
             * export function MyTabs({ children }) {
             *  const { NavigationContent } = useTabsWithChildren({ children })
             *
             *  return <NavigationContent />
             * }
             * ```
             */
            ? /**
             * Hook version of `Tabs`. The returned NavigationContent component
             * should be rendered. Using the hook requires using the `<TabList />`
             * and `<TabTrigger />` components exported from One.
             *
             * The `useTabsWithTriggers()` hook can be used for custom components.
             *
             * @see [`Tabs`](#tabs) for the component version of this hook.
             * @example
             * ```tsx
             * export function MyTabs({ children }) {
             *  const { NavigationContent } = useTabsWithChildren({ children })
             *
             *  return <NavigationContent />
             * }
             * ```
             */: unknown[] | undefined;
            routes: import("@react-navigation/routers").NavigationRoute<ParamListBase, string>[];
            type: string;
            stale: false;
        }>;
    } & import("@react-navigation/core").PrivateValueStore<[ParamListBase, unknown, unknown]> & import("@react-navigation/core").EventEmitter<TabNavigationEventMap> & {
        setParams(params: Partial<object | undefined>): void;
        replaceParams(params: object | undefined): void;
        pushParams(params: object | undefined): void;
    } & TabActionHelpers<ParamListBase>;
    descriptors: Record<string, import("@react-navigation/core").Descriptor<import("./TabContext").ExpoTabsNavigatorScreenOptions, import("@react-navigation/core").NavigationProp<ParamListBase, string, TabNavigationState<any>, import("./TabContext").ExpoTabsNavigatorScreenOptions, TabNavigationEventMap, TabActionHelpers<ParamListBase>>, Readonly<{
        key: string;
        name: string;
        path?: string | undefined;
        history?: {
            type: "params";
            params: object;
        }[] | undefined;
    } & Readonly<{
        params?: Readonly<object | undefined>;
    }>>>>;
    NavigationContent: ({ children }: {
        children: React.ReactNode;
    }) => import("react/jsx-runtime").JSX.Element;
};
/**
 * Alternative hook version of `Tabs` that uses explicit triggers
 * instead of `children`.
 *
 * @see [`Tabs`](#tabs) for the component version of this hook.
 * @example
 * ```tsx
 * export function MyTabs({ children }) {
 *   const { NavigationContent } = useTabsWithChildren({ triggers: [] })
 *
 *   return <NavigationContent />
 * }
 * ```
 */
export declare function useTabsWithTriggers(options: UseTabsWithTriggersOptions): TabsContextValue;
//# sourceMappingURL=Tabs.d.ts.map