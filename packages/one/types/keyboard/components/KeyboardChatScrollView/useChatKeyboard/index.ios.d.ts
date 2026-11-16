import type { UseChatKeyboardOptions, UseChatKeyboardReturn } from './types.js';
import type { AnimatedRef } from 'react-native-reanimated';
import type Reanimated from 'react-native-reanimated';
/**
 * Hook that manages keyboard-driven scrolling for chat-style scroll views.
 * Calculates padding (extra scrollable space) and content shift values,
 * using iOS-specific strategy (contentOffset set once in onStart).
 *
 * @param scrollViewRef - Animated ref to the scroll view.
 * @param options - Configuration for inverted and keyboardLiftBehavior.
 * @returns Shared values for padding and contentOffsetY.
 * @example
 * ```tsx
 * const { padding, contentOffsetY } = useChatKeyboard(ref, {
 *   inverted: false,
 *   keyboardLiftBehavior: "always",
 * });
 * ```
 */
declare function useChatKeyboard(scrollViewRef: AnimatedRef<Reanimated.ScrollView>, options: UseChatKeyboardOptions): UseChatKeyboardReturn;
export { useChatKeyboard };
//# sourceMappingURL=index.ios.d.ts.map