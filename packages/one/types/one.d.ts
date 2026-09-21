import { AppInfo, Compose, Haptics, MenuAction, SplitView, Swift, TextInput, ToolbarHost, ToolbarItem, UI as NativeUI, ZoomTransitionAlignmentRectDetector, ZoomTransitionEnabler, ZoomTransitionSource, type ColorType, useNativeState } from '@vxrn/native';
import { SafeAreaProvider, SafeAreaView, initialWindowMetrics, useSafeAreaFrame, useSafeAreaInsets } from '@vxrn/safe-area';
export type OnePlatform = 'web' | 'ios' | 'android' | 'rnx';
export type OneIOS = typeof Swift & {
    readonly Color: ColorType['ios'];
    readonly MenuAction: typeof MenuAction;
    readonly SplitView: typeof SplitView;
    readonly ToolbarHost: typeof ToolbarHost;
    readonly ToolbarItem: typeof ToolbarItem;
    readonly ZoomTransitionAlignmentRectDetector: typeof ZoomTransitionAlignmentRectDetector;
    readonly ZoomTransitionEnabler: typeof ZoomTransitionEnabler;
    readonly ZoomTransitionSource: typeof ZoomTransitionSource;
};
export type OneAndroid = typeof Compose;
export type OneSafeArea = {
    readonly Provider: typeof SafeAreaProvider;
    readonly View: typeof SafeAreaView;
    readonly initialMetrics: typeof initialWindowMetrics;
    readonly useFrame: typeof useSafeAreaFrame;
    readonly useInsets: typeof useSafeAreaInsets;
};
export type OneUI = typeof NativeUI & {
    readonly SafeArea: Readonly<OneSafeArea>;
    readonly Haptics: typeof Haptics;
    readonly TextInput: typeof TextInput;
    readonly useNativeState: typeof useNativeState;
};
export type OneAPI = {
    readonly platform: OnePlatform;
    readonly AppInfo: typeof AppInfo;
    readonly iOS: Readonly<OneIOS>;
    readonly Android: Readonly<OneAndroid>;
    readonly UI: Readonly<OneUI>;
};
export declare const One: OneAPI;
//# sourceMappingURL=one.d.ts.map