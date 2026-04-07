import type { ParamListBase, StackNavigationState } from '@react-navigation/native';
import { type NativeStackNavigationEventMap, type NativeStackNavigationOptions } from '@react-navigation/native-stack';
import React from 'react';
import { StackScreen, StackHeaderComponent, StackHeaderSearchBar } from './stack-utils';
export declare const Stack: React.ForwardRefExoticComponent<Omit<Omit<Omit<import("@react-navigation/routers").DefaultRouterOptions<string> & {
    children: React.ReactNode;
    layout?: ((props: {
        state: StackNavigationState<ParamListBase>;
        navigation: import("@react-navigation/core").NavigationHelpers<ParamListBase, {}>;
        descriptors: Record<string, import("@react-navigation/core").Descriptor<NativeStackNavigationOptions, import("@react-navigation/core").NavigationProp<ParamListBase, string, StackNavigationState<ParamListBase>, NativeStackNavigationOptions, NativeStackNavigationEventMap, {}>, Readonly<{
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
        children: React.ReactNode;
    }) => React.ReactElement) | undefined;
    screenListeners?: Partial<{
        transitionStart: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "transitionStart", unknown>;
        transitionEnd: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "transitionEnd", unknown>;
        gestureCancel: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "gestureCancel", unknown>;
        sheetDetentChange: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "sheetDetentChange", unknown>;
        focus: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "focus", unknown>;
        blur: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "blur", unknown>;
        state: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "state", unknown>;
        beforeRemove: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "beforeRemove", true>;
    }> | ((props: {
        route: Readonly<{
            key: string;
            name: string;
            path?: string | undefined;
            history?: {
                type: "params";
                params: object;
            }[] | undefined;
        } & Readonly<{
            params?: Readonly<object | undefined>;
        }>>;
        navigation: import("@react-navigation/native-stack").NativeStackNavigationProp<ParamListBase, string>;
    }) => Partial<{
        transitionStart: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "transitionStart", unknown>;
        transitionEnd: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "transitionEnd", unknown>;
        gestureCancel: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "gestureCancel", unknown>;
        sheetDetentChange: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "sheetDetentChange", unknown>;
        focus: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "focus", unknown>;
        blur: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "blur", unknown>;
        state: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "state", unknown>;
        beforeRemove: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "beforeRemove", true>;
    }>) | undefined;
    screenOptions?: NativeStackNavigationOptions | ((props: {
        route: Readonly<{
            key: string;
            name: string;
            path?: string | undefined;
            history?: {
                type: "params";
                params: object;
            }[] | undefined;
        } & Readonly<{
            params?: Readonly<object | undefined>;
        }>>;
        navigation: import("@react-navigation/native-stack").NativeStackNavigationProp<ParamListBase, string>;
        theme: import("@react-navigation/core").Theme;
    }) => NativeStackNavigationOptions) | undefined;
    screenLayout?: ((props: import("@react-navigation/core").ScreenLayoutArgs<ParamListBase, string, NativeStackNavigationOptions, import("@react-navigation/native-stack").NativeStackNavigationProp<ParamListBase, string>>) => React.ReactElement) | undefined;
    router?: (<Action extends Readonly<{
        type: string;
        payload?: object | undefined;
        source?: string | undefined;
        target?: string | undefined;
    }>>(original: import("@react-navigation/routers").Router<StackNavigationState<ParamListBase>, Action>) => Partial<import("@react-navigation/routers").Router<StackNavigationState<ParamListBase>, Action>>) | undefined;
    routeNamesChangeBehavior?: ("firstMatch" | "lastUnhandled") | undefined;
} & import("@react-navigation/routers").StackRouterOptions, "children" | "initialRouteName" | "layout" | "router" | "screenOptions" | "screenListeners" | "screenLayout" | "routeNamesChangeBehavior"> & import("@react-navigation/routers").DefaultRouterOptions<string> & {
    children: React.ReactNode;
    layout?: ((props: {
        state: StackNavigationState<ParamListBase>;
        navigation: import("@react-navigation/core").NavigationHelpers<ParamListBase, {}>;
        descriptors: Record<string, import("@react-navigation/core").Descriptor<NativeStackNavigationOptions, import("@react-navigation/core").NavigationProp<ParamListBase, string, StackNavigationState<ParamListBase>, NativeStackNavigationOptions, NativeStackNavigationEventMap, {}>, Readonly<{
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
        children: React.ReactNode;
    }) => React.ReactElement) | undefined;
    screenListeners?: Partial<{
        transitionStart: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "transitionStart", unknown>;
        transitionEnd: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "transitionEnd", unknown>;
        gestureCancel: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "gestureCancel", unknown>;
        sheetDetentChange: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "sheetDetentChange", unknown>;
        focus: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "focus", unknown>;
        blur: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "blur", unknown>;
        state: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "state", unknown>;
        beforeRemove: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "beforeRemove", true>;
    }> | ((props: {
        route: Readonly<{
            key: string;
            name: string;
            path?: string | undefined;
            history?: {
                type: "params";
                params: object;
            }[] | undefined;
        } & Readonly<{
            params?: Readonly<object | undefined>;
        }>>;
        navigation: import("@react-navigation/native-stack").NativeStackNavigationProp<ParamListBase, string>;
    }) => Partial<{
        transitionStart: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "transitionStart", unknown>;
        transitionEnd: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "transitionEnd", unknown>;
        gestureCancel: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "gestureCancel", unknown>;
        sheetDetentChange: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "sheetDetentChange", unknown>;
        focus: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "focus", unknown>;
        blur: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "blur", unknown>;
        state: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "state", unknown>;
        beforeRemove: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "beforeRemove", true>;
    }>) | undefined;
    screenOptions?: NativeStackNavigationOptions | ((props: {
        route: Readonly<{
            key: string;
            name: string;
            path?: string | undefined;
            history?: {
                type: "params";
                params: object;
            }[] | undefined;
        } & Readonly<{
            params?: Readonly<object | undefined>;
        }>>;
        navigation: import("@react-navigation/native-stack").NativeStackNavigationProp<ParamListBase, string>;
        theme: import("@react-navigation/core").Theme;
    }) => NativeStackNavigationOptions) | undefined;
    screenLayout?: ((props: import("@react-navigation/core").ScreenLayoutArgs<ParamListBase, string, NativeStackNavigationOptions, import("@react-navigation/native-stack").NativeStackNavigationProp<ParamListBase, string>>) => React.ReactElement) | undefined;
    router?: (<Action extends Readonly<{
        type: string;
        payload?: object | undefined;
        source?: string | undefined;
        target?: string | undefined;
    }>>(original: import("@react-navigation/routers").Router<StackNavigationState<ParamListBase>, Action>) => Partial<import("@react-navigation/routers").Router<StackNavigationState<ParamListBase>, Action>>) | undefined;
    routeNamesChangeBehavior?: ("firstMatch" | "lastUnhandled") | undefined;
}, "children"> & Partial<Pick<Omit<import("@react-navigation/routers").DefaultRouterOptions<string> & {
    children: React.ReactNode;
    layout?: ((props: {
        state: StackNavigationState<ParamListBase>;
        navigation: import("@react-navigation/core").NavigationHelpers<ParamListBase, {}>;
        descriptors: Record<string, import("@react-navigation/core").Descriptor<NativeStackNavigationOptions, import("@react-navigation/core").NavigationProp<ParamListBase, string, StackNavigationState<ParamListBase>, NativeStackNavigationOptions, NativeStackNavigationEventMap, {}>, Readonly<{
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
        children: React.ReactNode;
    }) => React.ReactElement) | undefined;
    screenListeners?: Partial<{
        transitionStart: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "transitionStart", unknown>;
        transitionEnd: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "transitionEnd", unknown>;
        gestureCancel: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "gestureCancel", unknown>;
        sheetDetentChange: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "sheetDetentChange", unknown>;
        focus: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "focus", unknown>;
        blur: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "blur", unknown>;
        state: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "state", unknown>;
        beforeRemove: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "beforeRemove", true>;
    }> | ((props: {
        route: Readonly<{
            key: string;
            name: string;
            path?: string | undefined;
            history?: {
                type: "params";
                params: object;
            }[] | undefined;
        } & Readonly<{
            params?: Readonly<object | undefined>;
        }>>;
        navigation: import("@react-navigation/native-stack").NativeStackNavigationProp<ParamListBase, string>;
    }) => Partial<{
        transitionStart: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "transitionStart", unknown>;
        transitionEnd: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "transitionEnd", unknown>;
        gestureCancel: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "gestureCancel", unknown>;
        sheetDetentChange: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "sheetDetentChange", unknown>;
        focus: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "focus", unknown>;
        blur: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "blur", unknown>;
        state: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "state", unknown>;
        beforeRemove: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "beforeRemove", true>;
    }>) | undefined;
    screenOptions?: NativeStackNavigationOptions | ((props: {
        route: Readonly<{
            key: string;
            name: string;
            path?: string | undefined;
            history?: {
                type: "params";
                params: object;
            }[] | undefined;
        } & Readonly<{
            params?: Readonly<object | undefined>;
        }>>;
        navigation: import("@react-navigation/native-stack").NativeStackNavigationProp<ParamListBase, string>;
        theme: import("@react-navigation/core").Theme;
    }) => NativeStackNavigationOptions) | undefined;
    screenLayout?: ((props: import("@react-navigation/core").ScreenLayoutArgs<ParamListBase, string, NativeStackNavigationOptions, import("@react-navigation/native-stack").NativeStackNavigationProp<ParamListBase, string>>) => React.ReactElement) | undefined;
    router?: (<Action extends Readonly<{
        type: string;
        payload?: object | undefined;
        source?: string | undefined;
        target?: string | undefined;
    }>>(original: import("@react-navigation/routers").Router<StackNavigationState<ParamListBase>, Action>) => Partial<import("@react-navigation/routers").Router<StackNavigationState<ParamListBase>, Action>>) | undefined;
    routeNamesChangeBehavior?: ("firstMatch" | "lastUnhandled") | undefined;
} & import("@react-navigation/routers").StackRouterOptions, "children" | "initialRouteName" | "layout" | "router" | "screenOptions" | "screenListeners" | "screenLayout" | "routeNamesChangeBehavior"> & import("@react-navigation/routers").DefaultRouterOptions<string> & {
    children: React.ReactNode;
    layout?: ((props: {
        state: StackNavigationState<ParamListBase>;
        navigation: import("@react-navigation/core").NavigationHelpers<ParamListBase, {}>;
        descriptors: Record<string, import("@react-navigation/core").Descriptor<NativeStackNavigationOptions, import("@react-navigation/core").NavigationProp<ParamListBase, string, StackNavigationState<ParamListBase>, NativeStackNavigationOptions, NativeStackNavigationEventMap, {}>, Readonly<{
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
        children: React.ReactNode;
    }) => React.ReactElement) | undefined;
    screenListeners?: Partial<{
        transitionStart: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "transitionStart", unknown>;
        transitionEnd: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "transitionEnd", unknown>;
        gestureCancel: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "gestureCancel", unknown>;
        sheetDetentChange: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "sheetDetentChange", unknown>;
        focus: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "focus", unknown>;
        blur: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "blur", unknown>;
        state: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "state", unknown>;
        beforeRemove: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "beforeRemove", true>;
    }> | ((props: {
        route: Readonly<{
            key: string;
            name: string;
            path?: string | undefined;
            history?: {
                type: "params";
                params: object;
            }[] | undefined;
        } & Readonly<{
            params?: Readonly<object | undefined>;
        }>>;
        navigation: import("@react-navigation/native-stack").NativeStackNavigationProp<ParamListBase, string>;
    }) => Partial<{
        transitionStart: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "transitionStart", unknown>;
        transitionEnd: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "transitionEnd", unknown>;
        gestureCancel: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "gestureCancel", unknown>;
        sheetDetentChange: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "sheetDetentChange", unknown>;
        focus: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "focus", unknown>;
        blur: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "blur", unknown>;
        state: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "state", unknown>;
        beforeRemove: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "beforeRemove", true>;
    }>) | undefined;
    screenOptions?: NativeStackNavigationOptions | ((props: {
        route: Readonly<{
            key: string;
            name: string;
            path?: string | undefined;
            history?: {
                type: "params";
                params: object;
            }[] | undefined;
        } & Readonly<{
            params?: Readonly<object | undefined>;
        }>>;
        navigation: import("@react-navigation/native-stack").NativeStackNavigationProp<ParamListBase, string>;
        theme: import("@react-navigation/core").Theme;
    }) => NativeStackNavigationOptions) | undefined;
    screenLayout?: ((props: import("@react-navigation/core").ScreenLayoutArgs<ParamListBase, string, NativeStackNavigationOptions, import("@react-navigation/native-stack").NativeStackNavigationProp<ParamListBase, string>>) => React.ReactElement) | undefined;
    router?: (<Action extends Readonly<{
        type: string;
        payload?: object | undefined;
        source?: string | undefined;
        target?: string | undefined;
    }>>(original: import("@react-navigation/routers").Router<StackNavigationState<ParamListBase>, Action>) => Partial<import("@react-navigation/routers").Router<StackNavigationState<ParamListBase>, Action>>) | undefined;
    routeNamesChangeBehavior?: ("firstMatch" | "lastUnhandled") | undefined;
}, "children">> & React.RefAttributes<unknown>, "ref"> & React.RefAttributes<unknown>> & {
    Screen: typeof StackScreen;
    Header: typeof StackHeaderComponent & {
        Left: typeof import("./stack-utils").StackHeaderLeft;
        Right: typeof import("./stack-utils").StackHeaderRight;
        BackButton: typeof import("./stack-utils").StackHeaderBackButton;
        Title: typeof import("./stack-utils").StackHeaderTitle;
        SearchBar: typeof StackHeaderSearchBar;
    };
    Protected: React.FunctionComponent<import("..").ProtectedProps>;
    SearchBar: typeof StackHeaderSearchBar;
};
export default Stack;
//# sourceMappingURL=Stack.d.ts.map