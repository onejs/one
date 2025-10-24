import { type BottomTabNavigationEventMap, type BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import type { ParamListBase, TabNavigationState } from '@react-navigation/native';
export declare const Tabs: import("react").ForwardRefExoticComponent<Omit<Omit<import("@react-navigation/bottom-tabs").BottomTabNavigatorProps, "children" | "initialRouteName" | "layout" | "id" | "screenOptions" | "screenListeners" | "screenLayout" | "UNSTABLE_router"> & import("@react-navigation/core").DefaultRouterOptions<string> & {
    children: React.ReactNode;
    layout?: ((props: {
        state: TabNavigationState<ParamListBase>;
        navigation: import("@react-navigation/core").NavigationHelpers<ParamListBase, {}>;
        descriptors: Record<string, import("@react-navigation/core").Descriptor<BottomTabNavigationOptions, import("@react-navigation/core").NavigationProp<ParamListBase, string, string | undefined, TabNavigationState<ParamListBase>, BottomTabNavigationOptions, BottomTabNavigationEventMap>, import("@react-navigation/core").RouteProp<ParamListBase, string>>>;
        children: React.ReactNode;
    }) => React.ReactElement) | undefined;
    screenListeners?: Partial<{
        tabPress: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "tabPress", true>;
        tabLongPress: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "tabLongPress", unknown>;
        transitionStart: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "transitionStart", unknown>;
        transitionEnd: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "transitionEnd", unknown>;
        focus: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "focus", unknown>;
        blur: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "blur", unknown>;
        state: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "state", unknown>;
        beforeRemove: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "beforeRemove", true>;
    }> | ((props: {
        route: import("@react-navigation/core").RouteProp<ParamListBase, string>;
        navigation: import("@react-navigation/bottom-tabs").BottomTabNavigationProp<ParamListBase, string, undefined>;
    }) => Partial<{
        tabPress: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "tabPress", true>;
        tabLongPress: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "tabLongPress", unknown>;
        transitionStart: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "transitionStart", unknown>;
        transitionEnd: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "transitionEnd", unknown>;
        focus: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "focus", unknown>;
        blur: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "blur", unknown>;
        state: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "state", unknown>;
        beforeRemove: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "beforeRemove", true>;
    }>) | undefined;
    screenOptions?: BottomTabNavigationOptions | ((props: {
        route: import("@react-navigation/core").RouteProp<ParamListBase, string>;
        navigation: import("@react-navigation/bottom-tabs").BottomTabNavigationProp<ParamListBase, string, undefined>;
        theme: ReactNavigation.Theme;
    }) => BottomTabNavigationOptions) | undefined;
    screenLayout?: ((props: {
        route: import("@react-navigation/core").RouteProp<ParamListBase, string>;
        navigation: import("@react-navigation/bottom-tabs").BottomTabNavigationProp<ParamListBase, string, undefined>;
        theme: ReactNavigation.Theme;
        children: React.ReactElement;
    }) => React.ReactElement) | undefined;
    UNSTABLE_router?: (<Action extends Readonly<{
        type: string;
        payload?: object;
        source?: string;
        target?: string;
    }>>(original: import("@react-navigation/core").Router<TabNavigationState<ParamListBase>, Action>) => Partial<import("@react-navigation/core").Router<TabNavigationState<ParamListBase>, Action>>) | undefined;
} & {
    id?: undefined;
}, "children"> & Partial<Pick<Omit<import("@react-navigation/bottom-tabs").BottomTabNavigatorProps, "children" | "initialRouteName" | "layout" | "id" | "screenOptions" | "screenListeners" | "screenLayout" | "UNSTABLE_router"> & import("@react-navigation/core").DefaultRouterOptions<string> & {
    children: React.ReactNode;
    layout?: ((props: {
        state: TabNavigationState<ParamListBase>;
        navigation: import("@react-navigation/core").NavigationHelpers<ParamListBase, {}>;
        descriptors: Record<string, import("@react-navigation/core").Descriptor<BottomTabNavigationOptions, import("@react-navigation/core").NavigationProp<ParamListBase, string, string | undefined, TabNavigationState<ParamListBase>, BottomTabNavigationOptions, BottomTabNavigationEventMap>, import("@react-navigation/core").RouteProp<ParamListBase, string>>>;
        children: React.ReactNode;
    }) => React.ReactElement) | undefined;
    screenListeners?: Partial<{
        tabPress: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "tabPress", true>;
        tabLongPress: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "tabLongPress", unknown>;
        transitionStart: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "transitionStart", unknown>;
        transitionEnd: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "transitionEnd", unknown>;
        focus: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "focus", unknown>;
        blur: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "blur", unknown>;
        state: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "state", unknown>;
        beforeRemove: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "beforeRemove", true>;
    }> | ((props: {
        route: import("@react-navigation/core").RouteProp<ParamListBase, string>;
        navigation: import("@react-navigation/bottom-tabs").BottomTabNavigationProp<ParamListBase, string, undefined>;
    }) => Partial<{
        tabPress: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "tabPress", true>;
        tabLongPress: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "tabLongPress", unknown>;
        transitionStart: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "transitionStart", unknown>;
        transitionEnd: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "transitionEnd", unknown>;
        focus: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "focus", unknown>;
        blur: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "blur", unknown>;
        state: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "state", unknown>;
        beforeRemove: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "beforeRemove", true>;
    }>) | undefined;
    screenOptions?: BottomTabNavigationOptions | ((props: {
        route: import("@react-navigation/core").RouteProp<ParamListBase, string>;
        navigation: import("@react-navigation/bottom-tabs").BottomTabNavigationProp<ParamListBase, string, undefined>;
        theme: ReactNavigation.Theme;
    }) => BottomTabNavigationOptions) | undefined;
    screenLayout?: ((props: {
        route: import("@react-navigation/core").RouteProp<ParamListBase, string>;
        navigation: import("@react-navigation/bottom-tabs").BottomTabNavigationProp<ParamListBase, string, undefined>;
        theme: ReactNavigation.Theme;
        children: React.ReactElement;
    }) => React.ReactElement) | undefined;
    UNSTABLE_router?: (<Action extends Readonly<{
        type: string;
        payload?: object;
        source?: string;
        target?: string;
    }>>(original: import("@react-navigation/core").Router<TabNavigationState<ParamListBase>, Action>) => Partial<import("@react-navigation/core").Router<TabNavigationState<ParamListBase>, Action>>) | undefined;
} & {
    id?: undefined;
}, "children">> & import("react").RefAttributes<unknown>> & {
    Screen: typeof import("../views/Screen").Screen;
};
export default Tabs;
//# sourceMappingURL=Tabs.d.ts.map