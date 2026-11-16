import type { ClippingScrollViewProps, FocusedInputEventsModule, KeyboardBackgroundViewProps, KeyboardControllerNativeModule, KeyboardControllerProps, KeyboardEventsModule, KeyboardExtenderProps, KeyboardGestureAreaProps, KeyboardToolbarGroupViewProps, OverKeyboardViewProps, WindowDimensionsEventsModule } from './typings/index.js';
export declare const KeyboardControllerNative: KeyboardControllerNativeModule;
/**
 * An event emitter that provides a way to subscribe to next keyboard events:
 * - `keyboardWillShow`;
 * - `keyboardDidShow`;
 * - `keyboardWillHide`;
 * - `keyboardDidHide`.
 *
 * Use `addListener` function to add your event listener for a specific keyboard event.
 */
export declare const KeyboardEvents: KeyboardEventsModule;
/**
 * This API is not documented, it's for internal usage only (for now), and is a subject to potential breaking changes in future.
 * Use it with cautious.
 */
export declare const FocusedInputEvents: FocusedInputEventsModule;
export declare const WindowDimensionsEvents: WindowDimensionsEventsModule;
/**
 * A view that sends events whenever keyboard or focused events are happening.
 *
 * @see {@link https://kirillzyusko.github.io/react-native-keyboard-controller/docs/api/keyboard-controller-view|Documentation} page for more details.
 */
export declare const KeyboardControllerView: React.FC<KeyboardControllerProps>;
export declare const KeyboardControllerViewCommands: {
    synchronizeFocusedInputLayout: (_ref: React.Component<KeyboardControllerProps> | null) => void;
};
/**
 * A view that defines a region on the screen, where gestures will control the keyboard position.
 *
 * @see {@link https://kirillzyusko.github.io/react-native-keyboard-controller/docs/api/keyboard-gesture-area|Documentation} page for more details.
 */
export declare const KeyboardGestureArea: React.FC<KeyboardGestureAreaProps>;
export declare const RCTOverKeyboardView: React.FC<OverKeyboardViewProps>;
/**
 * A view that matches keyboard background.
 *
 * @see {@link https://kirillzyusko.github.io/react-native-keyboard-controller/docs/api/keyboard-background-view|Documentation} page for more details.
 */
export declare const KeyboardBackgroundView: React.FC<KeyboardBackgroundViewProps>;
/**
 * A container that will embed its children into the keyboard
 * and will always show them above the keyboard.
 *
 * @see {@link https://kirillzyusko.github.io/react-native-keyboard-controller/docs/api/keyboard-extender|Documentation} page for more details.
 */
export declare const RCTKeyboardExtender: React.FC<KeyboardExtenderProps>;
/**
 * A decorator that will clip the content of the `ScrollView`. It helps to simulate `contentInset` behavior on Android
 * Supports only `bottom` property (`paddingBottom` is not supported property of `ScrollView.style`).
 * Using this component we can modify bottom inset without having a fake view.
 *
 * On iOS we use swizzling to apply runtime patches to fix some broken internal methods.
 * Ideally this component shouldn't exist and all its fixes/polyfills must be added directly to react-native and
 * we will port features/fixes back to upstream, but at the moment we use this view to
 * deliver desired functionality regardless of react-native version used.
 */
export declare const ClippingScrollView: React.FC<ClippingScrollViewProps>;
/**
 * A View that defines a group of `TextInput`s.
 * Used in toolbar navigation to assure that you can navigate only between inputs withing the same group.
 */
export declare const RCTKeyboardToolbarGroupView: React.FC<KeyboardToolbarGroupViewProps>;
//# sourceMappingURL=bindings.d.ts.map