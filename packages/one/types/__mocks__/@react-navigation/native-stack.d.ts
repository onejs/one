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
    presentation?: 'card' | 'modal' | 'transparentModal' | 'containedModal' | 'containedTransparentModal' | 'fullScreenModal' | 'formSheet' | 'pageSheet';
    sheetAllowedDetents?: number[] | 'fitToContents';
    sheetGrabberVisible?: boolean;
    sheetCornerRadius?: number;
    sheetInitialDetentIndex?: number | 'last';
    sheetLargestUndimmedDetentIndex?: number | 'none' | 'last';
    sheetExpandsWhenScrolledToEdge?: boolean;
};
export type NativeStackNavigationEventMap = Record<string, any>;
export declare const createNativeStackNavigator: () => {
    Navigator: () => null;
    Screen: () => null;
};
export declare const NativeStackView: (_props: any) => null;
//# sourceMappingURL=native-stack.d.ts.map