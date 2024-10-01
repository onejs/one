import type { ParamListBase, StackNavigationState } from '@react-navigation/native';
import { type NativeStackNavigationEventMap, type NativeStackNavigationOptions } from '@react-navigation/native-stack';
export declare const Stack: import("react").ForwardRefExoticComponent<Omit<Omit<import("@react-navigation/routers").DefaultRouterOptions<string> & {
    id?: string;
    children: React.ReactNode;
    screenListeners?: Partial<{
        transitionStart: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "transitionStart">;
        transitionEnd: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "transitionEnd">;
        focus: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "focus">;
        blur: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "blur">;
        state: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "state">;
        beforeRemove: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "beforeRemove">;
    }> | ((props: {
        route: import("@react-navigation/core").RouteProp<ParamListBase, string>;
        navigation: any;
    }) => Partial<{
        transitionStart: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "transitionStart">;
        transitionEnd: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "transitionEnd">;
        focus: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "focus">;
        blur: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "blur">;
        state: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "state">;
        beforeRemove: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "beforeRemove">;
    }>) | undefined;
    screenOptions?: NativeStackNavigationOptions | ((props: {
        route: import("@react-navigation/core").RouteProp<ParamListBase, string>;
        navigation: any;
    }) => NativeStackNavigationOptions) | undefined;
} & import("@react-navigation/routers").StackRouterOptions, "children" | "initialRouteName" | "id" | "screenListeners" | "screenOptions"> & import("@react-navigation/routers").DefaultRouterOptions<string> & {
    id?: string;
    children: React.ReactNode;
    screenListeners?: Partial<{
        transitionStart: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "transitionStart">;
        transitionEnd: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "transitionEnd">;
        focus: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "focus">;
        blur: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "blur">;
        state: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "state">;
        beforeRemove: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "beforeRemove">;
    }> | ((props: {
        route: import("@react-navigation/core").RouteProp<ParamListBase, string>;
        navigation: any;
    }) => Partial<{
        transitionStart: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "transitionStart">;
        transitionEnd: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "transitionEnd">;
        focus: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "focus">;
        blur: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "blur">;
        state: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "state">;
        beforeRemove: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "beforeRemove">;
    }>) | undefined;
    screenOptions?: NativeStackNavigationOptions | ((props: {
        route: import("@react-navigation/core").RouteProp<ParamListBase, string>;
        navigation: any;
    }) => NativeStackNavigationOptions) | undefined;
}, "children"> & Partial<Pick<Omit<import("@react-navigation/routers").DefaultRouterOptions<string> & {
    id?: string;
    children: React.ReactNode;
    screenListeners?: Partial<{
        transitionStart: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "transitionStart">;
        transitionEnd: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "transitionEnd">;
        focus: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "focus">;
        blur: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "blur">;
        state: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "state">;
        beforeRemove: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "beforeRemove">;
    }> | ((props: {
        route: import("@react-navigation/core").RouteProp<ParamListBase, string>;
        navigation: any;
    }) => Partial<{
        transitionStart: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "transitionStart">;
        transitionEnd: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "transitionEnd">;
        focus: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "focus">;
        blur: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "blur">;
        state: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "state">;
        beforeRemove: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "beforeRemove">;
    }>) | undefined;
    screenOptions?: NativeStackNavigationOptions | ((props: {
        route: import("@react-navigation/core").RouteProp<ParamListBase, string>;
        navigation: any;
    }) => NativeStackNavigationOptions) | undefined;
} & import("@react-navigation/routers").StackRouterOptions, "children" | "initialRouteName" | "id" | "screenListeners" | "screenOptions"> & import("@react-navigation/routers").DefaultRouterOptions<string> & {
    id?: string;
    children: React.ReactNode;
    screenListeners?: Partial<{
        transitionStart: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "transitionStart">;
        transitionEnd: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "transitionEnd">;
        focus: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "focus">;
        blur: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "blur">;
        state: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "state">;
        beforeRemove: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "beforeRemove">;
    }> | ((props: {
        route: import("@react-navigation/core").RouteProp<ParamListBase, string>;
        navigation: any;
    }) => Partial<{
        transitionStart: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "transitionStart">;
        transitionEnd: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "transitionEnd">;
        focus: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "focus">;
        blur: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "blur">;
        state: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "state">;
        beforeRemove: import("@react-navigation/core").EventListenerCallback<NativeStackNavigationEventMap & import("@react-navigation/core").EventMapCore<StackNavigationState<ParamListBase>>, "beforeRemove">;
    }>) | undefined;
    screenOptions?: NativeStackNavigationOptions | ((props: {
        route: import("@react-navigation/core").RouteProp<ParamListBase, string>;
        navigation: any;
    }) => NativeStackNavigationOptions) | undefined;
}, "children">> & import("react").RefAttributes<unknown>> & {
    Screen: (props: import("../useScreens").ScreenProps<NativeStackNavigationOptions, StackNavigationState<ParamListBase>, NativeStackNavigationEventMap>) => null;
};
export default Stack;
//# sourceMappingURL=Stack.d.ts.map