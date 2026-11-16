import { Commands as OneKeyboardControllerViewCommands } from '../platform/specs/OneKeyboardControllerViewNativeComponent.js';
import type { ClippingScrollViewProps, FocusedInputEventsModule, KeyboardBackgroundViewProps, KeyboardControllerNativeModule, KeyboardControllerProps, KeyboardEventsModule, KeyboardExtenderProps, KeyboardGestureAreaProps, KeyboardToolbarGroupViewProps, OverKeyboardViewProps, WindowDimensionsEventsModule } from './typings/index.js';
export declare const KeyboardControllerNative: KeyboardControllerNativeModule;
export declare const KeyboardEvents: KeyboardEventsModule;
/**
 * This API is not documented, it's for internal usage only (for now), and is a subject to potential breaking changes in future.
 * Use it with cautious.
 */
export declare const FocusedInputEvents: FocusedInputEventsModule;
export declare const WindowDimensionsEvents: WindowDimensionsEventsModule;
export declare const KeyboardControllerView: React.FC<KeyboardControllerProps>;
export { OneKeyboardControllerViewCommands as KeyboardControllerViewCommands };
export declare const KeyboardGestureArea: React.FC<KeyboardGestureAreaProps>;
export declare const RCTOverKeyboardView: React.FC<OverKeyboardViewProps>;
export declare const KeyboardBackgroundView: React.FC<KeyboardBackgroundViewProps>;
export declare const RCTKeyboardExtender: React.FC<KeyboardExtenderProps>;
export declare const ClippingScrollView: React.FC<ClippingScrollViewProps>;
export declare const RCTKeyboardToolbarGroupView: React.FC<KeyboardToolbarGroupViewProps>;
//# sourceMappingURL=bindings.ios.d.ts.map