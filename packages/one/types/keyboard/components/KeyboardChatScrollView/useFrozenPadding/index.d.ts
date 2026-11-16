import type { SharedValue } from 'react-native-reanimated';
type UseFrozenPaddingOptions = {
    /** When `true`, keyboard-driven layout writes are skipped. */
    freeze: SharedValue<boolean>;
    /** The distance between the bottom of the screen and the `ScrollView`. */
    offset: number;
    /** Keyboard-driven padding managed by `useChatKeyboard`. */
    padding: SharedValue<number>;
};
/**
 * Hook that reconciles keyboard padding after a frozen interval.
 *
 * `useChatKeyboard` handlers skip all writes while `freeze` is enabled, so if
 * the keyboard opens or closes during the frozen interval `padding` keeps a
 * stale value (e.g. the open-keyboard height after a frozen dismissal). This
 * hook observes keyboard events independently of `freeze` and recomputes the
 * padding from the latest observed keyboard height as soon as `freeze`
 * transitions back to `false`.
 *
 * @param options - Keyboard padding shared values plus the scroll view `offset`.
 * @param options.freeze - When `true`, keyboard-driven layout writes are skipped.
 * @param options.offset - The distance between the bottom of the screen and the `ScrollView`.
 * @param options.padding - Keyboard-driven padding managed by `useChatKeyboard`.
 * @example
 * ```ts
 * useFrozenPadding({ freeze, offset, padding });
 * ```
 */
declare function useFrozenPadding({ freeze, offset, padding }: UseFrozenPaddingOptions): void;
export { useFrozenPadding };
//# sourceMappingURL=index.d.ts.map