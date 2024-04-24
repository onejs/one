/// <reference types="react" />
import { type DrawerNavigationEventMap, type DrawerNavigationOptions } from '@react-navigation/drawer';
import type { DrawerNavigationState, ParamListBase } from '@react-navigation/native';
export declare const Drawer: import("react").ForwardRefExoticComponent<Omit<Omit<import("@react-navigation/routers").DefaultRouterOptions<string> & {
    id?: string | undefined;
    children: import("react").ReactNode;
    screenListeners?: Partial<{
        drawerItemPress: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "drawerItemPress">;
        focus: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "focus">;
        blur: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "blur">;
        state: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "state">;
        beforeRemove: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "beforeRemove">;
    }> | ((props: {
        route: import("@react-navigation/core").RouteProp<ParamListBase, string>;
        navigation: any;
    }) => Partial<{
        drawerItemPress: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "drawerItemPress">;
        focus: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "focus">;
        blur: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "blur">;
        state: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "state">;
        beforeRemove: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "beforeRemove">;
    }>) | undefined;
    screenOptions?: DrawerNavigationOptions | ((props: {
        route: import("@react-navigation/core").RouteProp<ParamListBase, string>;
        navigation: any;
    }) => DrawerNavigationOptions) | undefined;
} & import("@react-navigation/routers").DefaultRouterOptions & {
    backBehavior?: import("@react-navigation/routers/lib/typescript/src/TabRouter").BackBehavior | undefined;
} & {
    defaultStatus?: import("@react-navigation/routers").DrawerStatus | undefined;
} & import("@react-navigation/drawer/lib/typescript/src/types").DrawerNavigationConfig, "initialRouteName" | "children" | "id" | "screenListeners" | "screenOptions"> & import("@react-navigation/routers").DefaultRouterOptions<string> & {
    id?: string | undefined;
    children: import("react").ReactNode;
    screenListeners?: Partial<{
        drawerItemPress: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "drawerItemPress">;
        focus: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "focus">;
        blur: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "blur">;
        state: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "state">;
        beforeRemove: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "beforeRemove">;
    }> | ((props: {
        route: import("@react-navigation/core").RouteProp<ParamListBase, string>;
        navigation: any;
    }) => Partial<{
        drawerItemPress: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "drawerItemPress">;
        focus: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "focus">;
        blur: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "blur">;
        state: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "state">;
        beforeRemove: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "beforeRemove">;
    }>) | undefined;
    screenOptions?: DrawerNavigationOptions | ((props: {
        route: import("@react-navigation/core").RouteProp<ParamListBase, string>;
        navigation: any;
    }) => DrawerNavigationOptions) | undefined;
}, "children"> & Partial<Pick<Omit<import("@react-navigation/routers").DefaultRouterOptions<string> & {
    id?: string | undefined;
    children: import("react").ReactNode;
    screenListeners?: Partial<{
        drawerItemPress: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "drawerItemPress">;
        focus: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "focus">;
        blur: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "blur">;
        state: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "state">;
        beforeRemove: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "beforeRemove">;
    }> | ((props: {
        route: import("@react-navigation/core").RouteProp<ParamListBase, string>;
        navigation: any;
    }) => Partial<{
        drawerItemPress: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "drawerItemPress">;
        focus: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "focus">;
        blur: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "blur">;
        state: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "state">;
        beforeRemove: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "beforeRemove">;
    }>) | undefined;
    screenOptions?: DrawerNavigationOptions | ((props: {
        route: import("@react-navigation/core").RouteProp<ParamListBase, string>;
        navigation: any;
    }) => DrawerNavigationOptions) | undefined;
} & import("@react-navigation/routers").DefaultRouterOptions & {
    backBehavior?: import("@react-navigation/routers/lib/typescript/src/TabRouter").BackBehavior | undefined;
} & {
    defaultStatus?: import("@react-navigation/routers").DrawerStatus | undefined;
} & import("@react-navigation/drawer/lib/typescript/src/types").DrawerNavigationConfig, "initialRouteName" | "children" | "id" | "screenListeners" | "screenOptions"> & import("@react-navigation/routers").DefaultRouterOptions<string> & {
    id?: string | undefined;
    children: import("react").ReactNode;
    screenListeners?: Partial<{
        drawerItemPress: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "drawerItemPress">;
        focus: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "focus">;
        blur: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "blur">;
        state: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "state">;
        beforeRemove: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "beforeRemove">;
    }> | ((props: {
        route: import("@react-navigation/core").RouteProp<ParamListBase, string>;
        navigation: any;
    }) => Partial<{
        drawerItemPress: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "drawerItemPress">;
        focus: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "focus">;
        blur: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "blur">;
        state: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "state">;
        beforeRemove: import("@react-navigation/core").EventListenerCallback<DrawerNavigationEventMap & import("@react-navigation/core").EventMapCore<DrawerNavigationState<ParamListBase>>, "beforeRemove">;
    }>) | undefined;
    screenOptions?: DrawerNavigationOptions | ((props: {
        route: import("@react-navigation/core").RouteProp<ParamListBase, string>;
        navigation: any;
    }) => DrawerNavigationOptions) | undefined;
}, "children">> & import("react").RefAttributes<unknown>> & {
    Screen: (props: import("../useScreens").ScreenProps<DrawerNavigationOptions, DrawerNavigationState<ParamListBase>, DrawerNavigationEventMap>) => null;
};
export default Drawer;
//# sourceMappingURL=Drawer.d.ts.map