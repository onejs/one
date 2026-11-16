import type { UseChatKeyboardOptions, UseChatKeyboardReturn } from './types.js';
import type { AnimatedRef } from 'react-native-reanimated';
import type Reanimated from 'react-native-reanimated';
/**
 * Hook that manages keyboard-driven scrolling for chat-style scroll views.
 * Calculates padding (extra scrollable space) and content shift values,
 * using per-frame scrollTo updates (Android and other platforms).
 *
 * @param scrollViewRef - Animated ref to the scroll view.
 * @param options - Configuration for inverted and keyboardLiftBehavior.
 * @returns Shared values for padding and contentOffsetY (always `undefined`).
 * @example
 * ```tsx
 * const { padding } = useChatKeyboard(ref, { inverted: false, keyboardLiftBehavior: "always" });
 * ```
 */
declare function useChatKeyboard(scrollViewRef: AnimatedRef<Reanimated.ScrollView>, options: UseChatKeyboardOptions): UseChatKeyboardReturn;
export { useChatKeyboard };
//# sourceMappingURL=index.d.ts.map