export type NativeStackNavigationOptions = {
    title?: string;
    headerLargeTitle?: boolean;
    headerTitleAlign?: 'left' | 'center';
    headerTitleStyle?: any;
    headerLargeTitleStyle?: any;
    headerBackTitle?: string;
    headerBackTitleStyle?: any;
    headerBackImageSource?: any;
    headerBackButtonDisplayMode?: string;
    headerBackButtonMenuEnabled?: boolean;
    headerBackVisible?: boolean;
    headerSearchBarOptions?: any;
    headerShown?: boolean;
    headerBlurEffect?: string;
    headerStyle?: any;
    headerLargeStyle?: any;
    headerShadowVisible?: boolean;
    headerLargeTitleShadowVisible?: boolean;
    headerLeft?: () => any;
    headerRight?: () => any;
    header?: () => any;
    animation?: string;
    gestureEnabled?: boolean;
};
export declare const createNativeStackNavigator: () => {
    Navigator: () => null;
    Screen: () => null;
};
//# sourceMappingURL=native-stack.d.ts.map