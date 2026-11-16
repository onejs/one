import React from 'react';
import { View } from 'react-native';
import type { ViewProps } from 'react-native';
export type KeyboardAvoidingViewBaseProps = {
    /**
     * Controls whether this `KeyboardAvoidingView` instance should take effect.
     * This is useful when more than one is on the screen. Defaults to true.
     */
    enabled?: boolean;
    /**
     * Distance between the top of the user screen and the React Native view. This
     * may be non-zero in some cases. Defaults to 0.
     */
    keyboardVerticalOffset?: number;
    /**
     * When `true`, the view automatically detects its position on screen,
     * accounting for navigation headers, modals, and other layout offsets.
     * This means `keyboardVerticalOffset` becomes purely additive extra
     * space rather than compensation for unknown positioning.
     *
     * Defaults to `false` for backward compatibility.
     */
    automaticOffset?: boolean;
} & ViewProps;
export type KeyboardAvoidingViewProps = KeyboardAvoidingViewBaseProps & {
    /**
     * Specify how to react to the presence of the keyboard.
     */
    behavior?: 'height' | 'padding' | 'position' | 'translate-with-padding';
    /**
     * Style of the content container when `behavior` is 'position'.
     */
    contentContainerStyle?: ViewProps['style'];
};
/**
 * A View component that automatically adjusts its height, position, or bottom padding
 * when the keyboard appears to ensure that the content remains visible.
 *
 * @returns A View component that adjusts to keyboard visibility.
 * @see {@link https://kirillzyusko.github.io/react-native-keyboard-controller/docs/api/components/keyboard-avoiding-view|Documentation} page for more details.
 * @example
 * ```tsx
 * <KeyboardAvoidingView behavior="padding">
 *   <TextInput />
 * </KeyboardAvoidingView>
 * ```
 */
declare const KeyboardAvoidingView: React.ForwardRefExoticComponent<{
    /**
     * Controls whether this `KeyboardAvoidingView` instance should take effect.
     * This is useful when more than one is on the screen. Defaults to true.
     */
    enabled?: boolean;
    /**
     * Distance between the top of the user screen and the React Native view. This
     * may be non-zero in some cases. Defaults to 0.
     */
    keyboardVerticalOffset?: number;
    /**
     * When `true`, the view automatically detects its position on screen,
     * accounting for navigation headers, modals, and other layout offsets.
     * This means `keyboardVerticalOffset` becomes purely additive extra
     * space rather than compensation for unknown positioning.
     *
     * Defaults to `false` for backward compatibility.
     */
    automaticOffset?: boolean;
} & ViewProps & {
    /**
     * Specify how to react to the presence of the keyboard.
     */
    behavior?: 'height' | 'padding' | 'position' | 'translate-with-padding';
    /**
     * Style of the content container when `behavior` is 'position'.
     */
    contentContainerStyle?: ViewProps['style'];
} & {
    children?: React.ReactNode | undefined;
} & React.RefAttributes<View>>;
export default KeyboardAvoidingView;
//# sourceMappingURL=index.d.ts.map