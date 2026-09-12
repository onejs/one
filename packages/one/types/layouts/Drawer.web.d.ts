import type { DrawerNavigationEventMap, DrawerNavigationOptions } from '@react-navigation/drawer';
import { type DrawerNavigationState, type ParamListBase } from '@react-navigation/routers';
export declare const Drawer: import("react").ForwardRefExoticComponent<Omit<Omit<import("../types").PickPartial<Omit<any, "children" | "initialRouteName" | "layout" | "screenOptions" | "router" | "screenListeners" | "screenLayout" | "routeNamesChangeBehavior"> & import("@react-navigation/routers").DefaultRouterOptions<string> & {
    children: React.ReactNode;
    layout?: ((props: {
        state: Readonly<{
            key: string;
            index: number;
            routeNames: string[];
            history?: unknown[] | undefined;
            routes: import("@react-navigation/routers").NavigationRoute<ParamListBase, string>[];
            type: string;
            stale: false;
        }>;
        navigation: import("@react-navigation/core").NavigationHelpers<ParamListBase, {}>;
        descriptors: Record<string, import("@react-navigation/core").Descriptor<{}, import("@react-navigation/core").NavigationProp<ParamListBase, string, Readonly<{
            key: string;
            index: number;
            routeNames: string[];
            history?: unknown[] | undefined;
            routes: import("@react-navigation/routers").NavigationRoute<ParamListBase, string>[];
            type: string;
            stale: false;
        }>, {}, {}, {}>, Readonly<{
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
        children: React.ReactNode;
    }) => React.ReactElement) | undefined;
    screenListeners?: Partial<{
        focus: import("@react-navigation/core").EventListenerCallback<import("@react-navigation/core").EventMapCore<Readonly<{
            key: string;
            index: number;
            routeNames: string[];
            history?: unknown[] | undefined;
            routes: import("@react-navigation/routers").NavigationRoute<ParamListBase, string>[];
            type: string;
            stale: false;
        }>>, "focus", unknown>;
        blur: import("@react-navigation/core").EventListenerCallback<import("@react-navigation/core").EventMapCore<Readonly<{
            key: string;
            index: number;
            routeNames: string[];
            history?: unknown[] | undefined;
            routes: import("@react-navigation/routers").NavigationRoute<ParamListBase, string>[];
            type: string;
            stale: false;
        }>>, "blur", unknown>;
        state: import("@react-navigation/core").EventListenerCallback<import("@react-navigation/core").EventMapCore<Readonly<{
            key: string;
            index: number;
            routeNames: string[];
            history?: unknown[] | undefined;
            routes: import("@react-navigation/routers").NavigationRoute<ParamListBase, string>[];
            type: string;
            stale: false;
        }>>, "state", unknown>;
        beforeRemove: import("@react-navigation/core").EventListenerCallback<import("@react-navigation/core").EventMapCore<Readonly<{
            key: string;
            index: number;
            routeNames: string[];
            history?: unknown[] | undefined;
            routes: import("@react-navigation/routers").NavigationRoute<ParamListBase, string>[];
            type: string;
            stale: false;
        }>>, "beforeRemove", true>;
    }> | ((props: {
        route: Readonly<{
            key: string;
            name: string;
            path?: string | undefined;
            history?: {
                type: "params";
                params: Readonly<object | undefined>;
            }[] | undefined;
        } & {
            params?: Readonly<object | undefined>;
        }>;
        navigation: import("@react-navigation/core").NavigationProp<ParamListBase, string, Readonly<{
            key: string;
            index: number;
            routeNames: string[];
            history?: unknown[] | undefined;
            routes: import("@react-navigation/routers").NavigationRoute<ParamListBase, string>[];
            type: string;
            stale: false;
        }>, {}, {}, {}>;
    }) => Partial<{
        focus: import("@react-navigation/core").EventListenerCallback<import("@react-navigation/core").EventMapCore<Readonly<{
            key: string;
            index: number;
            routeNames: string[];
            history?: unknown[] | undefined;
            routes: import("@react-navigation/routers").NavigationRoute<ParamListBase, string>[];
            type: string;
            stale: false;
        }>>, "focus", unknown>;
        blur: import("@react-navigation/core").EventListenerCallback<import("@react-navigation/core").EventMapCore<Readonly<{
            key: string;
            index: number;
            routeNames: string[];
            history?: unknown[] | undefined;
            routes: import("@react-navigation/routers").NavigationRoute<ParamListBase, string>[];
            type: string;
            stale: false;
        }>>, "blur", unknown>;
        state: import("@react-navigation/core").EventListenerCallback<import("@react-navigation/core").EventMapCore<Readonly<{
            key: string;
            index: number;
            routeNames: string[];
            history?: unknown[] | undefined;
            routes: import("@react-navigation/routers").NavigationRoute<ParamListBase, string>[];
            type: string;
            stale: false;
        }>>, "state", unknown>;
        beforeRemove: import("@react-navigation/core").EventListenerCallback<import("@react-navigation/core").EventMapCore<Readonly<{
            key: string;
            index: number;
            routeNames: string[];
            history?: unknown[] | undefined;
            routes: import("@react-navigation/routers").NavigationRoute<ParamListBase, string>[];
            type: string;
            stale: false;
        }>>, "beforeRemove", true>;
    }>) | undefined;
    screenOptions?: {} | ((props: {
        route: Readonly<{
            key: string;
            name: string;
            path?: string | undefined;
            history?: {
                type: "params";
                params: Readonly<object | undefined>;
            }[] | undefined;
        } & {
            params?: Readonly<object | undefined>;
        }>;
        navigation: import("@react-navigation/core").NavigationProp<ParamListBase, string, Readonly<{
            key: string;
            index: number;
            routeNames: string[];
            history?: unknown[] | undefined;
            routes: import("@react-navigation/routers").NavigationRoute<ParamListBase, string>[];
            type: string;
            stale: false;
        }>, {}, {}, {}>;
        theme: import("@react-navigation/core").Theme;
    }) => {}) | undefined;
    screenLayout?: ((props: import("@react-navigation/core").ScreenLayoutArgs<ParamListBase, string, {}, import("@react-navigation/core").NavigationProp<ParamListBase, string, Readonly<{
        key: string;
        index: number;
        routeNames: string[];
        history?: unknown[] | undefined;
        routes: import("@react-navigation/routers").NavigationRoute<ParamListBase, string>[];
        type: string;
        stale: false;
    }>, {}, {}, {}>>) => React.ReactElement) | undefined;
    router?: (<Action extends Readonly<{
        type: string;
        payload?: object | undefined;
        source?: string | undefined;
        target?: string | undefined;
    }>>(original: import("@react-navigation/routers").Router<Readonly<{
        key: string;
        index: number;
        routeNames: string[];
        history?: unknown[] | undefined;
        routes: import("@react-navigation/routers").NavigationRoute<ParamListBase, string>[];
        type: string;
        stale: false;
    }>, Action>) => Partial<import("@react-navigation/routers").Router<Readonly<{
        key: string;
        index: number;
        routeNames: string[];
        history?: unknown[] | undefined;
        routes: import("@react-navigation/routers").NavigationRoute<ParamListBase, string>[];
        type: string;
        stale: false;
    }>, Action>>) | undefined;
    routeNamesChangeBehavior?: ("firstMatch" | "lastUnhandled") | undefined;
}, "children">, "ref"> & import("react").RefAttributes<unknown>, "ref"> & import("react").RefAttributes<unknown>> & {
    Screen: import("react").ComponentType<import("../router/useScreens").ScreenProps<DrawerNavigationOptions, DrawerNavigationState<ParamListBase>, DrawerNavigationEventMap>>;
};
export default Drawer;
//# sourceMappingURL=Drawer.web.d.ts.map