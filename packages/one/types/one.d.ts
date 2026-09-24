import { Browser as NativeBrowser, Widgets, LiveActivities, WidgetUI, Clipboard as NativeClipboard, AppInfo, Database, Compose, Fonts, Haptics, ImagePicker, MenuAction, Menu as NativeMenu, ContextMenu as NativeContextMenu, Notifications, Network as NativeNetwork, SplitView, Swift, TextInput, ToolbarHost, ToolbarItem, UI as NativeUI, getHinge, getSizeClass, onHingeChange, ReservedRegions, useHinge, useSizeClass, ZoomTransitionAlignmentRectDetector, ZoomTransitionEnabler, ZoomTransitionSource, type ColorType, useFonts, useNativeState, useNetworkState } from '@vxrn/native';
import { SafeAreaProvider, SafeAreaView, initialWindowMetrics, useSafeAreaFrame, useSafeAreaInsets } from '@vxrn/safe-area';
export type OnePlatform = 'web' | 'ios' | 'android' | 'rnx';
export type OneIOS = Omit<typeof Swift, 'ToolbarItem'> & {
    readonly Widgets: typeof Widgets;
    readonly LiveActivities: typeof LiveActivities;
    readonly WidgetUI: typeof WidgetUI;
    readonly Color: ColorType['ios'];
    readonly MenuAction: typeof MenuAction;
    readonly SplitView: typeof SplitView;
    readonly ToolbarHost: typeof ToolbarHost;
    readonly ToolbarItem: typeof ToolbarItem;
    readonly ZoomTransitionAlignmentRectDetector: typeof ZoomTransitionAlignmentRectDetector;
    readonly ZoomTransitionEnabler: typeof ZoomTransitionEnabler;
    readonly ZoomTransitionSource: typeof ZoomTransitionSource;
};
export type OneAndroid = typeof Compose & {
    readonly Menu: typeof NativeMenu;
    readonly ContextMenu: typeof NativeContextMenu;
};
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
    readonly useSizeClass: typeof useSizeClass;
    readonly getSizeClass: typeof getSizeClass;
    readonly useHinge: typeof useHinge;
    readonly getHinge: typeof getHinge;
    readonly onHingeChange: typeof onHingeChange;
    readonly ReservedRegions: typeof ReservedRegions;
};
export type OneNotifications = typeof Notifications;
export type OneAPI = {
    readonly platform: OnePlatform;
    readonly AppInfo: typeof AppInfo;
    readonly Database: typeof Database;
    readonly iOS: Readonly<OneIOS>;
    readonly Android: Readonly<OneAndroid>;
    readonly UI: Readonly<OneUI>;
    readonly Notifications: Readonly<OneNotifications>;
    readonly Clipboard: typeof NativeClipboard;
    readonly Network: typeof NativeNetwork;
    readonly Browser: typeof NativeBrowser;
    readonly ImagePicker: typeof ImagePicker;
    readonly useNetworkState: typeof useNetworkState;
};
export declare const One: OneAPI;
//# sourceMappingURL=one.d.ts.map
