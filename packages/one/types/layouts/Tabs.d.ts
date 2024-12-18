import { type BottomTabNavigationEventMap } from '@react-navigation/bottom-tabs';
import type { OneRouter } from '../interfaces/router';
export declare const Tabs: import("react").ForwardRefExoticComponent<any> & {
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
    }, any, BottomTabNavigationEventMap>) => null;
};
export default Tabs;
//# sourceMappingURL=Tabs.d.ts.map