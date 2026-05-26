import { type DrawerNavigationEventMap, type DrawerNavigationOptions } from '@react-navigation/drawer';
import type { DrawerNavigationState, ParamListBase } from '@react-navigation/native';
import React from 'react';
import { type DrawerRender } from '../router/renderingRegistry';
type DrawerExtraProps = {
    /**
     * Platform-keyed sidebar component. Replaces the default drawer content.
     * Dispatches on `Platform.OS` — `render.ios` works on iOS, `render.web`
     * on web, etc. Falls back to `setupRendering({ Drawer: { ... } })` global
     * if no prop is set, then to the built-in drawer content.
     */
    render?: DrawerRender;
};
export declare const Drawer: React.ForwardRefExoticComponent<Omit<Omit<Omit<import("@react-navigation/drawer").DrawerNavigatorProps, "children" | "initialRouteName" | "layout" | "id" | "screenOptions" | "screenListeners" | "screenLayout" | "UNSTABLE_router" | "UNSTABLE_routeNamesChangeBehavior"> & import("@react-navigation/routers").DefaultRouterOptions<string> & ({
    children: React.ReactNode;
    layout?: ((props: {
        state: DrawerNavigationState<ParamListBase>;
        navigation: import("@react-navigation/core").NavigationHelpers<ParamListBase, {}>;
        descriptors: Record<string, import("@react-navigation/core").Descriptor<DrawerNavigationOptions, import("@react-navigation/core").NavigationProp<ParamListBase, string, string | undefined, DrawerNavigationState<ParamListBase>, DrawerNavigationOptions, DrawerNavigationEventMap>, import("@react-navigation/core").RouteProp<ParamListBase, string>>>;
        children: React.ReactNode;
    }) => React.ReactElement) | undefined;
    screenListeners?: Partial<{
        drawerItemPress: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "drawerItemPress", true>;
        transitionStart: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "transitionStart", unknown>;
        transitionEnd: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "transitionEnd", unknown>;
        gestureStart: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "gestureStart", unknown>;
        gestureEnd: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "gestureEnd", unknown>;
        gestureCancel: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "gestureCancel", unknown>;
        focus: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "focus", unknown>;
        blur: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "blur", unknown>;
        state: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "state", unknown>;
        beforeRemove: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "beforeRemove", true>;
    }> | ((props: {
        route: import("@react-navigation/core").RouteProp<ParamListBase, string>;
        navigation: import("@react-navigation/drawer").DrawerNavigationProp<ParamListBase, string, string | undefined>;
    }) => Partial<{
        drawerItemPress: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "drawerItemPress", true>;
        transitionStart: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "transitionStart", unknown>;
        transitionEnd: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "transitionEnd", unknown>;
        gestureStart: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "gestureStart", unknown>;
        gestureEnd: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "gestureEnd", unknown>;
        gestureCancel: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "gestureCancel", unknown>;
        focus: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "focus", unknown>;
        blur: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "blur", unknown>;
        state: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "state", unknown>;
        beforeRemove: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "beforeRemove", true>;
    }>) | undefined;
    screenOptions?: DrawerNavigationOptions | ((props: {
        route: import("@react-navigation/core").RouteProp<ParamListBase, string>;
        navigation: import("@react-navigation/drawer").DrawerNavigationProp<ParamListBase, string, string | undefined>;
        theme: ReactNavigation.Theme;
    }) => DrawerNavigationOptions) | undefined;
    screenLayout?: ((props: import("@react-navigation/core").ScreenLayoutArgs<ParamListBase, string, DrawerNavigationOptions, import("@react-navigation/drawer").DrawerNavigationProp<ParamListBase, string, string | undefined>>) => React.ReactElement) | undefined;
    UNSTABLE_router?: (<Action extends Readonly<{
        type: string;
        payload?: object;
        source?: string;
        target?: string;
    }>>(original: import("@react-navigation/routers").Router<DrawerNavigationState<ParamListBase>, Action>) => Partial<import("@react-navigation/routers").Router<DrawerNavigationState<ParamListBase>, Action>>) | undefined;
    UNSTABLE_routeNamesChangeBehavior?: "firstMatch" | "lastUnhandled";
} & ({
    id?: undefined;
} | {
    id: string;
})), "children"> & Partial<Pick<Omit<import("@react-navigation/drawer").DrawerNavigatorProps, "children" | "initialRouteName" | "layout" | "id" | "screenOptions" | "screenListeners" | "screenLayout" | "UNSTABLE_router" | "UNSTABLE_routeNamesChangeBehavior"> & import("@react-navigation/routers").DefaultRouterOptions<string> & ({
    children: React.ReactNode;
    layout?: ((props: {
        state: DrawerNavigationState<ParamListBase>;
        navigation: import("@react-navigation/core").NavigationHelpers<ParamListBase, {}>;
        descriptors: Record<string, import("@react-navigation/core").Descriptor<DrawerNavigationOptions, import("@react-navigation/core").NavigationProp<ParamListBase, string, string | undefined, DrawerNavigationState<ParamListBase>, DrawerNavigationOptions, DrawerNavigationEventMap>, import("@react-navigation/core").RouteProp<ParamListBase, string>>>;
        children: React.ReactNode;
    }) => React.ReactElement) | undefined;
    screenListeners?: Partial<{
        drawerItemPress: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "drawerItemPress", true>;
        transitionStart: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "transitionStart", unknown>;
        transitionEnd: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "transitionEnd", unknown>;
        gestureStart: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "gestureStart", unknown>;
        gestureEnd: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "gestureEnd", unknown>;
        gestureCancel: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "gestureCancel", unknown>;
        focus: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "focus", unknown>;
        blur: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "blur", unknown>;
        state: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "state", unknown>;
        beforeRemove: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "beforeRemove", true>;
    }> | ((props: {
        route: import("@react-navigation/core").RouteProp<ParamListBase, string>;
        navigation: import("@react-navigation/drawer").DrawerNavigationProp<ParamListBase, string, string | undefined>;
    }) => Partial<{
        drawerItemPress: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "drawerItemPress", true>;
        transitionStart: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "transitionStart", unknown>;
        transitionEnd: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "transitionEnd", unknown>;
        gestureStart: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "gestureStart", unknown>;
        gestureEnd: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "gestureEnd", unknown>;
        gestureCancel: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "gestureCancel", unknown>;
        focus: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "focus", unknown>;
        blur: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "blur", unknown>;
        state: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "state", unknown>;
        beforeRemove: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "beforeRemove", true>;
    }>) | undefined;
    screenOptions?: DrawerNavigationOptions | ((props: {
        route: import("@react-navigation/core").RouteProp<ParamListBase, string>;
        navigation: import("@react-navigation/drawer").DrawerNavigationProp<ParamListBase, string, string | undefined>;
        theme: ReactNavigation.Theme;
    }) => DrawerNavigationOptions) | undefined;
    screenLayout?: ((props: import("@react-navigation/core").ScreenLayoutArgs<ParamListBase, string, DrawerNavigationOptions, import("@react-navigation/drawer").DrawerNavigationProp<ParamListBase, string, string | undefined>>) => React.ReactElement) | undefined;
    UNSTABLE_router?: (<Action extends Readonly<{
        type: string;
        payload?: object;
        source?: string;
        target?: string;
    }>>(original: import("@react-navigation/routers").Router<DrawerNavigationState<ParamListBase>, Action>) => Partial<import("@react-navigation/routers").Router<DrawerNavigationState<ParamListBase>, Action>>) | undefined;
    UNSTABLE_routeNamesChangeBehavior?: "firstMatch" | "lastUnhandled";
} & ({
    id?: undefined;
} | {
    id: string;
})), "children">> & React.RefAttributes<unknown> & DrawerExtraProps, "ref"> & React.RefAttributes<unknown>>;
export default Drawer;
//# sourceMappingURL=Drawer.d.ts.map