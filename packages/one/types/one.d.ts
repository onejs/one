import { Browser as NativeBrowser, Clipboard as NativeClipboard, AppInfo, Compose, Fonts, Haptics, ImagePicker, MenuAction, Network as NativeNetwork, SplitView, Swift, TextInput, ToolbarHost, ToolbarItem, UI as NativeUI, ZoomTransitionAlignmentRectDetector, ZoomTransitionEnabler, ZoomTransitionSource, type ColorType, useFonts, useNativeState, useNetworkState } from '@vxrn/native';
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
    readonly Fonts: typeof Fonts;
    readonly SafeArea: Readonly<OneSafeArea>;
    readonly Haptics: typeof Haptics;
    readonly TextInput: typeof TextInput;
    readonly useFonts: typeof useFonts;
    readonly useNativeState: typeof useNativeState;
};
export type OneAPI = {
    readonly platform: OnePlatform;
    readonly AppInfo: typeof AppInfo;
    readonly iOS: Readonly<OneIOS>;
    readonly Android: Readonly<OneAndroid>;
    readonly UI: Readonly<OneUI>;
    readonly Clipboard: typeof NativeClipboard;
    readonly Network: typeof NativeNetwork;
    readonly Browser: typeof NativeBrowser;
    readonly ImagePicker: typeof ImagePicker;
    readonly useNetworkState: typeof useNetworkState;
};
export declare const One: OneAPI;
//# sourceMappingURL=one.d.ts.map