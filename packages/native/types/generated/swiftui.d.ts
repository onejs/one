export type MenuOrder = 'automatic' | 'priority' | 'fixed';
export type Visibility = 'automatic' | 'visible' | 'hidden';
export type PickerStyle = 'wheel' | 'inline' | 'automatic' | 'segmented' | 'palette' | 'navigationLink' | 'menu';
export type DatePickerStyle = 'wheel' | 'automatic' | 'graphical' | 'compact';
export type ToggleStyle = 'button' | 'automatic' | 'switch';
export type MenuActionDismissBehavior = 'automatic' | 'enabled' | 'disabled';
export type TabBarMinimizeBehavior = 'automatic' | 'onScrollDown' | 'onScrollUp' | 'never';
export type ButtonRole = 'destructive' | 'cancel' | 'confirm' | 'close';
export type TabRole = 'search';
export type ControlGroupStyle = 'palette' | 'automatic' | 'navigation' | 'menu' | 'compactMenu';
export type PrimitiveButtonStyle = 'automatic' | 'glass' | 'borderless' | 'glassProminent' | 'plain' | 'bordered' | 'borderedProminent';
export type ProgressViewStyle = 'linear' | 'circular' | 'automatic';
export type GaugeStyle = 'accessoryCircularCapacity' | 'linearCapacity' | 'accessoryLinear' | 'accessoryLinearCapacity' | 'automatic' | 'accessoryCircular';
export type TextFieldStyle = 'automatic' | 'roundedBorder' | 'plain';
export type SubmitLabel = 'done' | 'go' | 'send' | 'join' | 'route' | 'search' | 'return' | 'next' | 'continue';
export type TextInputAutocapitalization = 'never' | 'words' | 'sentences' | 'characters';
export type Axis = 'horizontal' | 'vertical';
export type Edge = 'top' | 'leading' | 'bottom' | 'trailing';
export type PresentationAdaptation = 'automatic' | 'none' | 'popover' | 'sheet' | 'fullScreenCover';
export type PresentationContentInteraction = 'automatic' | 'resizes' | 'scrolls';
export type ColorScheme = 'light' | 'dark';
export type DynamicTypeSize = 'xSmall' | 'small' | 'medium' | 'large' | 'xLarge' | 'xxLarge' | 'xxxLarge' | 'accessibility1' | 'accessibility2' | 'accessibility3' | 'accessibility4' | 'accessibility5';
export type SymbolRenderingMode = 'monochrome' | 'multicolor' | 'hierarchical' | 'palette';
export type SymbolVariants = 'none' | 'circle' | 'square' | 'rectangle' | 'fill' | 'slash';
export type ImageScale = 'small' | 'medium' | 'large';
export type PhotosPickerSelectionBehavior = 'default' | 'ordered' | 'continuous' | 'continuousAndOrdered';
export type EncodingDisambiguationPolicy = 'automatic' | 'current' | 'compatible';
export type BackForwardNavigationGesturesBehavior = 'automatic' | 'enabled' | 'disabled';
export type MagnificationGesturesBehavior = 'automatic' | 'enabled' | 'disabled';
export type LinkPreviewBehavior = 'automatic' | 'enabled' | 'disabled';
export type ElementFullscreenBehavior = 'automatic' | 'enabled' | 'disabled';
export declare const swiftUIValues: {
    readonly MenuOrder: {
        readonly automatic: 16;
        readonly priority: 16;
        readonly fixed: 16;
    };
    readonly Visibility: {
        readonly automatic: 15;
        readonly visible: 15;
        readonly hidden: 15;
    };
    readonly PickerStyle: {
        readonly wheel: 13;
        readonly inline: 14;
        readonly automatic: 13;
        readonly segmented: 13;
        readonly palette: 17;
        readonly navigationLink: 16;
        readonly menu: 14;
    };
    readonly DatePickerStyle: {
        readonly wheel: 13;
        readonly automatic: 13;
        readonly graphical: 14;
        readonly compact: 14;
    };
    readonly ToggleStyle: {
        readonly button: 15;
        readonly automatic: 13;
        readonly switch: 13;
    };
    readonly MenuActionDismissBehavior: {
        readonly automatic: 16.4;
        readonly enabled: 16.4;
        readonly disabled: 16.4;
    };
    readonly TabBarMinimizeBehavior: {
        readonly automatic: 26;
        readonly onScrollDown: 26;
        readonly onScrollUp: 26;
        readonly never: 26;
    };
    readonly ButtonRole: {
        readonly destructive: 15;
        readonly cancel: 15;
        readonly confirm: 26;
        readonly close: 26;
    };
    readonly TabRole: {
        readonly search: 18;
    };
    readonly ControlGroupStyle: {
        readonly palette: 17;
        readonly automatic: 15;
        readonly navigation: 15;
        readonly menu: 16.4;
        readonly compactMenu: 16.4;
    };
    readonly PrimitiveButtonStyle: {
        readonly automatic: 13;
        readonly glass: 26;
        readonly borderless: 13;
        readonly glassProminent: 26;
        readonly plain: 13;
        readonly bordered: 15;
        readonly borderedProminent: 15;
    };
    readonly ProgressViewStyle: {
        readonly linear: 14;
        readonly circular: 14;
        readonly automatic: 14;
    };
    readonly GaugeStyle: {
        readonly accessoryCircularCapacity: 16;
        readonly linearCapacity: 16;
        readonly accessoryLinear: 16;
        readonly accessoryLinearCapacity: 16;
        readonly automatic: 16;
        readonly accessoryCircular: 16;
    };
    readonly TextFieldStyle: {
        readonly automatic: 13;
        readonly roundedBorder: 13;
        readonly plain: 13;
    };
    readonly SubmitLabel: {
        readonly done: 15;
        readonly go: 15;
        readonly send: 15;
        readonly join: 15;
        readonly route: 15;
        readonly search: 15;
        readonly return: 15;
        readonly next: 15;
        readonly continue: 15;
    };
    readonly TextInputAutocapitalization: {
        readonly never: 15;
        readonly words: 15;
        readonly sentences: 15;
        readonly characters: 15;
    };
    readonly Axis: {
        readonly horizontal: 13;
        readonly vertical: 13;
    };
    readonly Edge: {
        readonly top: 13;
        readonly leading: 13;
        readonly bottom: 13;
        readonly trailing: 13;
    };
    readonly PresentationAdaptation: {
        readonly automatic: 16.4;
        readonly none: 16.4;
        readonly popover: 16.4;
        readonly sheet: 16.4;
        readonly fullScreenCover: 16.4;
    };
    readonly PresentationContentInteraction: {
        readonly automatic: 16.4;
        readonly resizes: 16.4;
        readonly scrolls: 16.4;
    };
    readonly ColorScheme: {
        readonly light: 13;
        readonly dark: 13;
    };
    readonly DynamicTypeSize: {
        readonly xSmall: 15;
        readonly small: 15;
        readonly medium: 15;
        readonly large: 15;
        readonly xLarge: 15;
        readonly xxLarge: 15;
        readonly xxxLarge: 15;
        readonly accessibility1: 15;
        readonly accessibility2: 15;
        readonly accessibility3: 15;
        readonly accessibility4: 15;
        readonly accessibility5: 15;
    };
    readonly SymbolRenderingMode: {
        readonly monochrome: 15;
        readonly multicolor: 15;
        readonly hierarchical: 15;
        readonly palette: 15;
    };
    readonly SymbolVariants: {
        readonly none: 15;
        readonly circle: 15;
        readonly square: 15;
        readonly rectangle: 15;
        readonly fill: 15;
        readonly slash: 15;
    };
    readonly ImageScale: {
        readonly small: 13;
        readonly medium: 13;
        readonly large: 13;
    };
    readonly PhotosPickerSelectionBehavior: {
        readonly default: 16;
        readonly ordered: 16;
        readonly continuous: 17;
        readonly continuousAndOrdered: 17;
    };
    readonly EncodingDisambiguationPolicy: {
        readonly automatic: 16;
        readonly current: 16;
        readonly compatible: 16;
    };
    readonly BackForwardNavigationGesturesBehavior: {
        readonly automatic: 26;
        readonly enabled: 26;
        readonly disabled: 26;
    };
    readonly MagnificationGesturesBehavior: {
        readonly automatic: 26;
        readonly enabled: 26;
        readonly disabled: 26;
    };
    readonly LinkPreviewBehavior: {
        readonly automatic: 26;
        readonly enabled: 26;
        readonly disabled: 26;
    };
    readonly ElementFullscreenBehavior: {
        readonly automatic: 26;
        readonly enabled: 26;
        readonly disabled: 26;
    };
};
export declare function assertSwiftUIValue(type: keyof typeof swiftUIValues, value: string, iosVersion: number): void;
//# sourceMappingURL=swiftui.d.ts.map