import { useSharedValue } from 'react-native-reanimated'

import { useKeyboardHandler } from '../../../hooks'
import { useAnimatedReaction } from '../../../reanimated'
import { getEffectiveHeight } from '../useChatKeyboard/helpers'

import type { SharedValue } from 'react-native-reanimated'

type UseFrozenPaddingOptions = {
  /** When `true`, keyboard-driven layout writes are skipped. */
  freeze: SharedValue<boolean>
  /** The distance between the bottom of the screen and the `ScrollView`. */
  offset: number
  /** Keyboard-driven padding managed by `useChatKeyboard`. */
  padding: SharedValue<number>
}

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
function useFrozenPadding({ freeze, offset, padding }: UseFrozenPaddingOptions): void {
  const lastHeight = useSharedValue(0)
  const targetKeyboardHeight = useSharedValue(0)

  useKeyboardHandler(
    {
      onStart: (e) => {
        'worklet'

        if (e.height > 0) {
          // eslint-disable-next-line react-compiler/react-compiler
          targetKeyboardHeight.value = e.height
        }
      },
      onMove: (e) => {
        'worklet'

        lastHeight.value = e.height
      },
      onEnd: (e) => {
        'worklet'

        lastHeight.value = e.height
      },
    },
    []
  )

  useAnimatedReaction(
    () => freeze.value,
    (isFrozen, wasFrozen) => {
      if (!isFrozen && wasFrozen === true) {
        padding.value = getEffectiveHeight(
          lastHeight.value,
          targetKeyboardHeight.value,
          offset
        )
      }
    },
    [offset]
  )
}

export { useFrozenPadding }
