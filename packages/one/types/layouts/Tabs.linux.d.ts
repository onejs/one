export declare const Tabs: import("react").ForwardRefExoticComponent<Omit<import("../types").PickPartial<Omit<any, "children" | "initialRouteName" | "layout" | "routeNamesChangeBehavior" | "router" | "screenLayout" | "screenListeners" | "screenOptions"> & import("@react-navigation/routers").DefaultRouterOptions<string> & {
    children: React.ReactNode;
    layout?: ((props: {
        state: Readonly<{
            key: string;
            index: number;
            routeNames: string[];
            history?: unknown[] | undefined;
            routes: import("@react-navigation/routers").NavigationRoute<import("@react-navigation/routers").ParamListBase, string>[];
            type: string;
            stale: false;
        }>;
        navigation: import("@react-navigation/core").NavigationHelpers<import("@react-navigation/routers").ParamListBase, Readonly<{
            key: string;
            index: number;
            routeNames: string[];
            history?: unknown[] | undefined;
            routes: import("@react-navigation/routers").NavigationRoute<import("@react-navigation/routers").ParamListBase, string>[];
            type: string;
            stale: false;
        }>, {}>;
        descriptors: Record<string, import("@react-navigation/core").Descriptor<{}, import("@react-navigation/core").NavigationProp<import("@react-navigation/routers").ParamListBase, string, Readonly<{
            key: string;
            index: number;
            routeNames: string[];
            history?: unknown[] | undefined;
            routes: import("@react-navigation/routers").NavigationRoute<import("@react-navigation/routers").ParamListBase, string>[];
            type: string;
            stale: false;
        }>, {}, {}, {}>, Readonly<{
            key: string;
            name: string;
            path?: string | undefined;
            history?: {
                type: 'params';
                params: Readonly<object | undefined>;
            }[] | undefined;
        } & {
            params?: Readonly<object | undefined>;
        }>>>;
        children: React.ReactNode;
    }) => React.ReactElement) | undefined;
    screenListeners?: Partial<{
        focus: import("@react-navigation/core").EventListenerCallback<import("@react-navigation/core").EventMapCore<Readonly<{
            key: string;
            index: number;
            routeNames: string[];
            history?: unknown[] | undefined;
            routes: import("@react-navigation/routers").NavigationRoute<import("@react-navigation/routers").ParamListBase, string>[];
            type: string;
            stale: false;
        }>>, "focus", unknown>;
        blur: import("@react-navigation/core").EventListenerCallback<import("@react-navigation/core").EventMapCore<Readonly<{
            key: string;
            index: number;
            routeNames: string[];
            history?: unknown[] | undefined;
            routes: import("@react-navigation/routers").NavigationRoute<import("@react-navigation/routers").ParamListBase, string>[];
            type: string;
            stale: false;
        }>>, "blur", unknown>;
        state: import("@react-navigation/core").EventListenerCallback<import("@react-navigation/core").EventMapCore<Readonly<{
            key: string;
            index: number;
            routeNames: string[];
            history?: unknown[] | undefined;
            routes: import("@react-navigation/routers").NavigationRoute<import("@react-navigation/routers").ParamListBase, string>[];
            type: string;
            stale: false;
        }>>, "state", unknown>;
        beforeRemove: import("@react-navigation/core").EventListenerCallback<import("@react-navigation/core").EventMapCore<Readonly<{
            key: string;
            index: number;
            routeNames: string[];
            history?: unknown[] | undefined;
            routes: import("@react-navigation/routers").NavigationRoute<import("@react-navigation/routers").ParamListBase, string>[];
            type: string;
            stale: false;
        }>>, "beforeRemove", true>;
    }> | ((props: {
        route: Readonly<{
            key: string;
            name: string;
            path?: string | undefined;
            history?: {
                type: 'params';
                params: Readonly<object | undefined>;
            }[] | undefined;
        } & {
            params?: Readonly<object | undefined>;
        }>;
        navigation: import("@react-navigation/core").NavigationProp<import("@react-navigation/routers").ParamListBase, string, Readonly<{
            key: string;
            index: number;
            routeNames: string[];
            history?: unknown[] | undefined;
            routes: import("@react-navigation/routers").NavigationRoute<import("@react-navigation/routers").ParamListBase, string>[];
            type: string;
            stale: false;
        }>, {}, {}, {}>;
    }) => Partial<{
        focus: import("@react-navigation/core").EventListenerCallback<import("@react-navigation/core").EventMapCore<Readonly<{
            key: string;
            index: number;
            routeNames: string[];
            history?: unknown[] | undefined;
            routes: import("@react-navigation/routers").NavigationRoute<import("@react-navigation/routers").ParamListBase, string>[];
            type: string;
            stale: false;
        }>>, "focus", unknown>;
        blur: import("@react-navigation/core").EventListenerCallback<import("@react-navigation/core").EventMapCore<Readonly<{
            key: string;
            index: number;
            routeNames: string[];
            history?: unknown[] | undefined;
            routes: import("@react-navigation/routers").NavigationRoute<import("@react-navigation/routers").ParamListBase, string>[];
            type: string;
            stale: false;
        }>>, "blur", unknown>;
        state: import("@react-navigation/core").EventListenerCallback<import("@react-navigation/core").EventMapCore<Readonly<{
            key: string;
            index: number;
            routeNames: string[];
            history?: unknown[] | undefined;
            routes: import("@react-navigation/routers").NavigationRoute<import("@react-navigation/routers").ParamListBase, string>[];
            type: string;
            stale: false;
        }>>, "state", unknown>;
        beforeRemove: import("@react-navigation/core").EventListenerCallback<import("@react-navigation/core").EventMapCore<Readonly<{
            key: string;
            index: number;
            routeNames: string[];
            history?: unknown[] | undefined;
            routes: import("@react-navigation/routers").NavigationRoute<import("@react-navigation/routers").ParamListBase, string>[];
            type: string;
            stale: false;
        }>>, "beforeRemove", true>;
    }>) | undefined;
    screenOptions?: ((props: {
        route: Readonly<{
            key: string;
            name: string;
            path?: string | undefined;
            history?: {
                type: 'params';
                params: Readonly<object | undefined>;
            }[] | undefined;
        } & {
            params?: Readonly<object | undefined>;
        }>;
        navigation: import("@react-navigation/core").NavigationProp<import("@react-navigation/routers").ParamListBase, string, Readonly<{
            key: string;
            index: number;
            routeNames: string[];
            history?: unknown[] | undefined;
            routes: import("@react-navigation/routers").NavigationRoute<import("@react-navigation/routers").ParamListBase, string>[];
            type: string;
            stale: false;
        }>, {}, {}, {}>;
        theme: import("@react-navigation/core").Theme;
    }) => {}) | {} | undefined;
    screenLayout?: ((props: import("@react-navigation/core").ScreenLayoutArgs<import("@react-navigation/routers").ParamListBase, string, {}, import("@react-navigation/core").NavigationProp<import("@react-navigation/routers").ParamListBase, string, Readonly<{
        key: string;
        index: number;
        routeNames: string[];
        history?: unknown[] | undefined;
        routes: import("@react-navigation/routers").NavigationRoute<import("@react-navigation/routers").ParamListBase, string>[];
        type: string;
        stale: false;
    }>, {}, {}, {}>>) => React.ReactElement) | undefined;
    router?: (<Action extends import("@react-navigation/routers").NavigationAction>(original: import("@react-navigation/routers").Router<Readonly<{
        key: string;
        index: number;
        routeNames: string[];
        history?: unknown[] | undefined;
        routes: import("@react-navigation/routers").NavigationRoute<import("@react-navigation/routers").ParamListBase, string>[];
        type: string;
        stale: false;
    }>, Action>) => Partial<import("@react-navigation/routers").Router<Readonly<{
        key: string;
        index: number;
        routeNames: string[];
        history?: unknown[] | undefined;
        routes: import("@react-navigation/routers").NavigationRoute<import("@react-navigation/routers").ParamListBase, string>[];
        type: string;
        stale: false;
    }>, Action>>) | undefined;
    routeNamesChangeBehavior?: ('firstMatch' | 'lastUnhandled') | undefined;
}, "children">, "ref"> & import("react").RefAttributes<unknown>> & {
    Screen: import("react").ComponentType<import("../router/useScreens").ScreenProps<object, Readonly<{
        key: string;
        index: number;
        routeNames: string[];
        history?: unknown[] | undefined;
        routes: import("@react-navigation/routers").NavigationRoute<import("@react-navigation/routers").ParamListBase, string>[];
        type: string;
        stale: false;
    }>, import("@react-navigation/core").EventMapBase>>;
} & {
    Protected: import("react").FunctionComponent<import("..").ProtectedProps>;
    Screen: import("react").ComponentType<import("../router/useScreens").ScreenProps<object, Readonly<{
        key: string;
        index: number;
        routeNames: string[];
        history?: unknown[] | undefined;
        routes: import("@react-navigation/routers").NavigationRoute<import("@react-navigation/routers").ParamListBase, string>[];
        type: string;
        stale: false;
    }>, import("@react-navigation/core").EventMapBase>>;
};
export default Tabs;
//# sourceMappingURL=Tabs.linux.d.ts.map