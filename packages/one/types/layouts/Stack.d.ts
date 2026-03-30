import type { ParamListBase, StackNavigationState } from '@react-navigation/native';
import { type NativeStackNavigationEventMap, type NativeStackNavigationOptions } from '@react-navigation/native-stack';
import React from 'react';
import { StackScreen, StackHeaderComponent, StackHeaderSearchBar } from './stack-utils';
export declare const Stack: React.ForwardRefExoticComponent<Omit<Omit<Omit<import("@react-navigation/native-stack").NativeStackNavigatorProps, "children" | "initialRouteName" | "layout" | "id" | "screenOptions" | "screenListeners" | "screenLayout" | "UNSTABLE_router" | "UNSTABLE_routeNamesChangeBehavior"> & import("@react-navigation/routers").DefaultRouterOptions<string> & ({
    children: React.ReactNode;
    layout?: ((props: {
        state: StackNavigationState<ParamListBase>;
        navigation: import("@react-navigation/native").NavigationHelpers<ParamListBase, {}>;
        descriptors: Record<string, import("@react-navigation/native").Descriptor<NativeStackNavigationOptions, import("@react-navigation/native").NavigationProp<ParamListBase, string, string | undefined, StackNavigationState<ParamListBase>, NativeStackNavigationOptions, NativeStackNavigationEventMap>, import("@react-navigation/native").RouteProp<ParamListBase, string>>>;
        children: React.ReactNode;
    }) => React.ReactElement) | undefined;
    screenListeners?: Partial<{
        transitionStart: import("@react-navigation/native").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/native").EventMapCore<StackNavigationState<ParamListBase>>, "transitionStart", unknown>;
        transitionEnd: import("@react-navigation/native").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/native").EventMapCore<StackNavigationState<ParamListBase>>, "transitionEnd", unknown>;
        gestureCancel: import("@react-navigation/native").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/native").EventMapCore<StackNavigationState<ParamListBase>>, "gestureCancel", unknown>;
        sheetDetentChange: import("@react-navigation/native").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/native").EventMapCore<StackNavigationState<ParamListBase>>, "sheetDetentChange", unknown>;
        focus: import("@react-navigation/native").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/native").EventMapCore<StackNavigationState<ParamListBase>>, "focus", unknown>;
        blur: import("@react-navigation/native").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/native").EventMapCore<StackNavigationState<ParamListBase>>, "blur", unknown>;
        state: import("@react-navigation/native").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/native").EventMapCore<StackNavigationState<ParamListBase>>, "state", unknown>;
        beforeRemove: import("@react-navigation/native").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/native").EventMapCore<StackNavigationState<ParamListBase>>, "beforeRemove", true>;
    }> | ((props: {
        route: import("@react-navigation/native").RouteProp<ParamListBase, string>;
        navigation: import("@react-navigation/native-stack").NativeStackNavigationProp<ParamListBase, string, string | undefined>;
    }) => Partial<{
        transitionStart: import("@react-navigation/native").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/native").EventMapCore<StackNavigationState<ParamListBase>>, "transitionStart", unknown>;
        transitionEnd: import("@react-navigation/native").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/native").EventMapCore<StackNavigationState<ParamListBase>>, "transitionEnd", unknown>;
        gestureCancel: import("@react-navigation/native").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/native").EventMapCore<StackNavigationState<ParamListBase>>, "gestureCancel", unknown>;
        sheetDetentChange: import("@react-navigation/native").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/native").EventMapCore<StackNavigationState<ParamListBase>>, "sheetDetentChange", unknown>;
        focus: import("@react-navigation/native").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/native").EventMapCore<StackNavigationState<ParamListBase>>, "focus", unknown>;
        blur: import("@react-navigation/native").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/native").EventMapCore<StackNavigationState<ParamListBase>>, "blur", unknown>;
        state: import("@react-navigation/native").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/native").EventMapCore<StackNavigationState<ParamListBase>>, "state", unknown>;
        beforeRemove: import("@react-navigation/native").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/native").EventMapCore<StackNavigationState<ParamListBase>>, "beforeRemove", true>;
    }>) | undefined;
    screenOptions?: NativeStackNavigationOptions | ((props: {
        route: import("@react-navigation/native").RouteProp<ParamListBase, string>;
        navigation: import("@react-navigation/native-stack").NativeStackNavigationProp<ParamListBase, string, string | undefined>;
        theme: ReactNavigation.Theme;
    }) => NativeStackNavigationOptions) | undefined;
    screenLayout?: ((props: import("@react-navigation/native").ScreenLayoutArgs<ParamListBase, string, NativeStackNavigationOptions, import("@react-navigation/native-stack").NativeStackNavigationProp<ParamListBase, string, string | undefined>>) => React.ReactElement) | undefined;
    UNSTABLE_router?: (<Action extends Readonly<{
        type: string;
        payload?: object;
        source?: string;
        target?: string;
    }>>(original: import("@react-navigation/routers").Router<StackNavigationState<ParamListBase>, Action>) => Partial<import("@react-navigation/routers").Router<StackNavigationState<ParamListBase>, Action>>) | undefined;
    UNSTABLE_routeNamesChangeBehavior?: "firstMatch" | "lastUnhandled";
} & ({
    id?: undefined;
} | {
    id: string;
})), "children"> & Partial<Pick<Omit<import("@react-navigation/native-stack").NativeStackNavigatorProps, "children" | "initialRouteName" | "layout" | "id" | "screenOptions" | "screenListeners" | "screenLayout" | "UNSTABLE_router" | "UNSTABLE_routeNamesChangeBehavior"> & import("@react-navigation/routers").DefaultRouterOptions<string> & ({
    children: React.ReactNode;
    layout?: ((props: {
        state: StackNavigationState<ParamListBase>;
        navigation: import("@react-navigation/native").NavigationHelpers<ParamListBase, {}>;
        descriptors: Record<string, import("@react-navigation/native").Descriptor<NativeStackNavigationOptions, import("@react-navigation/native").NavigationProp<ParamListBase, string, string | undefined, StackNavigationState<ParamListBase>, NativeStackNavigationOptions, NativeStackNavigationEventMap>, import("@react-navigation/native").RouteProp<ParamListBase, string>>>;
        children: React.ReactNode;
    }) => React.ReactElement) | undefined;
    screenListeners?: Partial<{
        transitionStart: import("@react-navigation/native").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/native").EventMapCore<StackNavigationState<ParamListBase>>, "transitionStart", unknown>;
        transitionEnd: import("@react-navigation/native").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/native").EventMapCore<StackNavigationState<ParamListBase>>, "transitionEnd", unknown>;
        gestureCancel: import("@react-navigation/native").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/native").EventMapCore<StackNavigationState<ParamListBase>>, "gestureCancel", unknown>;
        sheetDetentChange: import("@react-navigation/native").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/native").EventMapCore<StackNavigationState<ParamListBase>>, "sheetDetentChange", unknown>;
        focus: import("@react-navigation/native").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/native").EventMapCore<StackNavigationState<ParamListBase>>, "focus", unknown>;
        blur: import("@react-navigation/native").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/native").EventMapCore<StackNavigationState<ParamListBase>>, "blur", unknown>;
        state: import("@react-navigation/native").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/native").EventMapCore<StackNavigationState<ParamListBase>>, "state", unknown>;
        beforeRemove: import("@react-navigation/native").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/native").EventMapCore<StackNavigationState<ParamListBase>>, "beforeRemove", true>;
    }> | ((props: {
        route: import("@react-navigation/native").RouteProp<ParamListBase, string>;
        navigation: import("@react-navigation/native-stack").NativeStackNavigationProp<ParamListBase, string, string | undefined>;
    }) => Partial<{
        transitionStart: import("@react-navigation/native").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/native").EventMapCore<StackNavigationState<ParamListBase>>, "transitionStart", unknown>;
        transitionEnd: import("@react-navigation/native").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/native").EventMapCore<StackNavigationState<ParamListBase>>, "transitionEnd", unknown>;
        gestureCancel: import("@react-navigation/native").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/native").EventMapCore<StackNavigationState<ParamListBase>>, "gestureCancel", unknown>;
        sheetDetentChange: import("@react-navigation/native").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/native").EventMapCore<StackNavigationState<ParamListBase>>, "sheetDetentChange", unknown>;
        focus: import("@react-navigation/native").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/native").EventMapCore<StackNavigationState<ParamListBase>>, "focus", unknown>;
        blur: import("@react-navigation/native").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/native").EventMapCore<StackNavigationState<ParamListBase>>, "blur", unknown>;
        state: import("@react-navigation/native").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/native").EventMapCore<StackNavigationState<ParamListBase>>, "state", unknown>;
        beforeRemove: import("@react-navigation/native").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/native").EventMapCore<StackNavigationState<ParamListBase>>, "beforeRemove", true>;
    }>) | undefined;
    screenOptions?: NativeStackNavigationOptions | ((props: {
        route: import("@react-navigation/native").RouteProp<ParamListBase, string>;
        navigation: import("@react-navigation/native-stack").NativeStackNavigationProp<ParamListBase, string, string | undefined>;
        theme: ReactNavigation.Theme;
    }) => NativeStackNavigationOptions) | undefined;
    screenLayout?: ((props: import("@react-navigation/native").ScreenLayoutArgs<ParamListBase, string, NativeStackNavigationOptions, import("@react-navigation/native-stack").NativeStackNavigationProp<ParamListBase, string, string | undefined>>) => React.ReactElement) | undefined;
    UNSTABLE_router?: (<Action extends Readonly<{
        type: string;
        payload?: object;
        source?: string;
        target?: string;
    }>>(original: import("@react-navigation/routers").Router<StackNavigationState<ParamListBase>, Action>) => Partial<import("@react-navigation/routers").Router<StackNavigationState<ParamListBase>, Action>>) | undefined;
    UNSTABLE_routeNamesChangeBehavior?: "firstMatch" | "lastUnhandled";
} & ({
    id?: undefined;
} | {
    id: string;
})), "children">> & React.RefAttributes<unknown>, "ref"> & React.RefAttributes<unknown>> & {
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