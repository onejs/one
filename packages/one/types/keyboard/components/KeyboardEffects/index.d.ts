import React from 'react';
import { View } from 'react-native';
import type { KeyboardStickyViewProps } from '../KeyboardStickyView/index.js';
export type KeyboardEffectsProps = {
    /**
     * Whether the keyboard backdrop should be translucent.
     *
     * @default false
     */
    translucent?: boolean;
    /**
     * Whether the effect view should match the keyboard's rounded top corners.
     *
     * Set to `false` when the effect should fully cover the keyboard bounds.
     *
     * @default true
     */
    rounded?: boolean;
} & KeyboardStickyViewProps;
/**
 * A component that renders content behind the keyboard. Since the keyboard
 * is translucent, the content (colors, gradients, animations) will blend
 * through and create visual effects on the keyboard.
 *
 * On iOS 26+ the keyboard has rounded corners, and the effect view
 * automatically matches that shape.
 *
 * @returns A view component positioned behind the keyboard.
 * @example
 * ```tsx
 * <KeyboardEffects>
 *   <View style={{ flex: 1, backgroundColor: "purple" }} />
 * </KeyboardEffects>
 * ```
 */
declare const KeyboardEffects: React.ForwardRefExoticComponent<{
    /**
     * Whether the keyboard backdrop should be translucent.
     *
     * @default false
     */
    translucent?: boolean;
    /**
     * Whether the effect view should match the keyboard's rounded top corners.
     *
     * Set to `false` when the effect should fully cover the keyboard bounds.
     *
     * @default true
     */
    rounded?: boolean;
} & {
    offset?: {
        closed?: number;
        opened?: number;
    };
    enabled?: boolean;
} & import("react-native").ViewProps & {
    children?: React.ReactNode | undefined;
} & React.RefAttributes<View>>;
export default KeyboardEffects;
//# sourceMappingURL=index.d.ts.map