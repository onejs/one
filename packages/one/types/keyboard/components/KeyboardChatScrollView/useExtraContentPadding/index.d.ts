import type { KeyboardLiftBehavior } from '../useChatKeyboard/types.js';
import type { AnimatedRef, SharedValue } from 'react-native-reanimated';
import type Reanimated from 'react-native-reanimated';
type UseExtraContentPaddingOptions = {
    scrollViewRef: AnimatedRef<Reanimated.ScrollView>;
    extraContentPadding: SharedValue<number>;
    /** Keyboard-only padding from useChatKeyboard — used to compute total padding for clamping. */
    keyboardPadding: SharedValue<number>;
    /** Minimum inset floor — used to absorb keyboard and extraContentPadding changes. */
    blankSpace: SharedValue<number>;
    /** Current vertical scroll offset. */
    scroll: SharedValue<number>;
    /** Visible viewport dimensions. */
    layout: SharedValue<{
        width: number;
        height: number;
    }>;
    /** Total content dimensions. */
    size: SharedValue<{
        width: number;
        height: number;
    }>;
    /** IOS only — when provided, sets contentOffset atomically with contentInset. */
    contentOffsetY?: SharedValue<number>;
    /** Lowest scroll offset, `-contentInset.top` on iOS. Defaults to `0`. */
    minScroll?: number;
    inverted: boolean;
    keyboardLiftBehavior: KeyboardLiftBehavior;
    freeze: SharedValue<boolean>;
};
/**
 * Hook that reacts to `extraContentPadding` changes and conditionally
 * adjusts the scroll position using `scrollTo` on both iOS and Android.
 *
 * Padding extension (scrollable range) is handled externally via a
 * `useDerivedValue` that sums keyboard padding + extra content padding.
 * This hook only handles the scroll correction.
 *
 * @param options - Configuration and shared values.
 * @example
 * ```tsx
 * useExtraContentPadding({ scrollViewRef, extraContentPadding, ... });
 * ```
 */
declare function useExtraContentPadding(options: UseExtraContentPaddingOptions): void;
export { useExtraContentPadding };
export type { UseExtraContentPaddingOptions };
//# sourceMappingURL=index.d.ts.map