import { type BottomTabNavigationEventMap, type BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import type { ParamListBase, TabNavigationState } from '@react-navigation/native';
import type { OneRouter } from '../interfaces/router';
export declare const Tabs: import("react").ForwardRefExoticComponent<Omit<Omit<import("@react-navigation/routers").DefaultRouterOptions<string> & {
    id?: string;
    children: React.ReactNode;
    screenListeners?: Partial<{
        tabPress: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "tabPress">;
        tabLongPress: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "tabLongPress">;
        focus: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "focus">;
        blur: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "blur">;
        state: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "state">;
        beforeRemove: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "beforeRemove">;
    }> | ((props: {
        route: import("@react-navigation/core").RouteProp<ParamListBase, string>;
        navigation: any;
    }) => Partial<{
        tabPress: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "tabPress">;
        tabLongPress: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "tabLongPress">;
        focus: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "focus">;
        blur: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "blur">;
        state: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "state">;
        beforeRemove: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "beforeRemove">;
    }>) | undefined;
    screenOptions?: BottomTabNavigationOptions | ((props: {
        route: import("@react-navigation/core").RouteProp<ParamListBase, string>;
        navigation: any;
    }) => BottomTabNavigationOptions) | undefined;
} & import("@react-navigation/routers").DefaultRouterOptions & {
    backBehavior?: import("@react-navigation/routers/lib/typescript/src/TabRouter").BackBehavior;
} & import("@react-navigation/bottom-tabs/lib/typescript/src/types").BottomTabNavigationConfig, "children" | "initialRouteName" | "id" | "screenListeners" | "screenOptions"> & import("@react-navigation/routers").DefaultRouterOptions<string> & {
    id?: string;
    children: React.ReactNode;
    screenListeners?: Partial<{
        tabPress: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "tabPress">;
        tabLongPress: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "tabLongPress">;
        focus: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "focus">;
        blur: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "blur">;
        state: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "state">;
        beforeRemove: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "beforeRemove">;
    }> | ((props: {
        route: import("@react-navigation/core").RouteProp<ParamListBase, string>;
        navigation: any;
    }) => Partial<{
        tabPress: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "tabPress">;
        tabLongPress: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "tabLongPress">;
        focus: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "focus">;
        blur: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "blur">;
        state: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "state">;
        beforeRemove: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "beforeRemove">;
    }>) | undefined;
    screenOptions?: BottomTabNavigationOptions | ((props: {
        route: import("@react-navigation/core").RouteProp<ParamListBase, string>;
        navigation: any;
    }) => BottomTabNavigationOptions) | undefined;
}, "children"> & Partial<Pick<Omit<import("@react-navigation/routers").DefaultRouterOptions<string> & {
    id?: string;
    children: React.ReactNode;
    screenListeners?: Partial<{
        tabPress: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "tabPress">;
        tabLongPress: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "tabLongPress">;
        focus: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "focus">;
        blur: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "blur">;
        state: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "state">;
        beforeRemove: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "beforeRemove">;
    }> | ((props: {
        route: import("@react-navigation/core").RouteProp<ParamListBase, string>;
        navigation: any;
    }) => Partial<{
        tabPress: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "tabPress">;
        tabLongPress: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "tabLongPress">;
        focus: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "focus">;
        blur: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "blur">;
        state: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "state">;
        beforeRemove: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "beforeRemove">;
    }>) | undefined;
    screenOptions?: BottomTabNavigationOptions | ((props: {
        route: import("@react-navigation/core").RouteProp<ParamListBase, string>;
        navigation: any;
    }) => BottomTabNavigationOptions) | undefined;
} & import("@react-navigation/routers").DefaultRouterOptions & {
    backBehavior?: import("@react-navigation/routers/lib/typescript/src/TabRouter").BackBehavior;
} & import("@react-navigation/bottom-tabs/lib/typescript/src/types").BottomTabNavigationConfig, "children" | "initialRouteName" | "id" | "screenListeners" | "screenOptions"> & import("@react-navigation/routers").DefaultRouterOptions<string> & {
    id?: string;
    children: React.ReactNode;
    screenListeners?: Partial<{
        tabPress: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "tabPress">;
        tabLongPress: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "tabLongPress">;
        focus: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "focus">;
        blur: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "blur">;
        state: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "state">;
        beforeRemove: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "beforeRemove">;
    }> | ((props: {
        route: import("@react-navigation/core").RouteProp<ParamListBase, string>;
        navigation: any;
    }) => Partial<{
        tabPress: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "tabPress">;
        tabLongPress: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "tabLongPress">;
        focus: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "focus">;
        blur: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "blur">;
        state: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "state">;
        beforeRemove: import("@react-navigation/core").EventListenerCallback<BottomTabNavigationEventMap & import("@react-navigation/core").EventMapCore<TabNavigationState<ParamListBase>>, "beforeRemove">;
    }>) | undefined;
    screenOptions?: BottomTabNavigationOptions | ((props: {
        route: import("@react-navigation/core").RouteProp<ParamListBase, string>;
        navigation: any;
    }) => BottomTabNavigationOptions) | undefined;
}, "children">> & import("react").RefAttributes<unknown>> & {
    Screen: (props: import("../useScreens").ScreenProps<import("@react-navigation/elements").HeaderOptions & {
        title?: string;
        tabBarLabel?: string | ((props: {
            focused: boolean;
            color: string;
            position: import("@react-navigation/bottom-tabs/lib/typescript/src/types").LabelPosition;
            children: string;
        }) => React.ReactNode);
        tabBarShowLabel?: boolean;
        tabBarLabelPosition?: import("@react-navigation/bottom-tabs/lib/typescript/src/types").LabelPosition;
        tabBarLabelStyle?: import("react-native").StyleProp<import("react-native").TextStyle>;
        tabBarAllowFontScaling?: boolean;
        tabBarIcon?: (props: {
            focused: boolean;
            color: string;
            size: number;
        }) => React.ReactNode;
        tabBarIconStyle?: import("react-native").StyleProp<import("react-native").TextStyle>;
        tabBarBadge?: number | string;
        tabBarBadgeStyle?: import("react-native").StyleProp<import("react-native").TextStyle>;
        tabBarAccessibilityLabel?: string;
        tabBarTestID?: string;
        tabBarButton?: (props: import("@react-navigation/bottom-tabs").BottomTabBarButtonProps) => React.ReactNode;
        tabBarActiveTintColor?: string;
        tabBarInactiveTintColor?: string;
        tabBarActiveBackgroundColor?: string;
        tabBarInactiveBackgroundColor?: string;
        tabBarItemStyle?: import("react-native").StyleProp<import("react-native").ViewStyle>;
        tabBarHideOnKeyboard?: boolean;
        tabBarVisibilityAnimationConfig?: {
            show?: import("@react-navigation/bottom-tabs/lib/typescript/src/types").TabBarVisibilityAnimationConfig;
            hide?: import("@react-navigation/bottom-tabs/lib/typescript/src/types").TabBarVisibilityAnimationConfig;
        };
        tabBarStyle?: import("react-native").Animated.WithAnimatedValue<import("react-native").StyleProp<import("react-native").ViewStyle>>;
        tabBarBackground?: () => React.ReactNode;
        lazy?: boolean;
        header?: (props: import("@react-navigation/bottom-tabs").BottomTabHeaderProps) => React.ReactNode;
        headerShown?: boolean;
        unmountOnBlur?: boolean;
        freezeOnBlur?: boolean;
    } & {
        href?: OneRouter.Href | null;
    }, TabNavigationState<ParamListBase>, BottomTabNavigationEventMap>) => null;
};
export default Tabs;
//# sourceMappingURL=Tabs.d.ts.map