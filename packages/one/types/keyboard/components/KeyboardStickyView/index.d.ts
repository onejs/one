import React from 'react';
import type { View, ViewProps } from 'react-native';
export type KeyboardStickyViewProps = {
    /**
     * Specify additional offset to the view for given keyboard state.
     */
    offset?: {
        /**
         * Adds additional `translateY` when keyboard is close. By default `0`.
         */
        closed?: number;
        /**
         * Adds additional `translateY` when keyboard is open. By default `0`.
         */
        opened?: number;
    };
    /** Controls whether this `KeyboardStickyView` instance should take effect. Default is `true`. */
    enabled?: boolean;
} & ViewProps;
/**
 * A View component that sticks to the keyboard and moves with it when it appears or disappears.
 * The view can be configured with custom offsets for both closed and open keyboard states.
 *
 * @returns An animated View component that sticks to the keyboard.
 * @see {@link https://kirillzyusko.github.io/react-native-keyboard-controller/docs/api/components/keyboard-sticky-view|Documentation} page for more details.
 * @example
 * ```tsx
 * <KeyboardStickyView offset={{ closed: 0, opened: 20 }}>
 *   <Button title="Submit" />
 * </KeyboardStickyView>
 * ```
 */
declare const KeyboardStickyView: React.ForwardRefExoticComponent<{
    /**
     * Specify additional offset to the view for given keyboard state.
     */
    offset?: {
        /**
         * Adds additional `translateY` when keyboard is close. By default `0`.
         */
        closed?: number;
        /**
         * Adds additional `translateY` when keyboard is open. By default `0`.
         */
        opened?: number;
    };
    /** Controls whether this `KeyboardStickyView` instance should take effect. Default is `true`. */
    enabled?: boolean;
} & ViewProps & {
    children?: React.ReactNode | undefined;
} & React.RefAttributes<View>>;
export default KeyboardStickyView;
//# sourceMappingURL=index.d.ts.map