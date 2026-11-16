import { useSharedValue } from 'react-native-reanimated'

import { useKeyboardHandler } from '../../../hooks'
import useScrollState from '../../hooks/useScrollState'

import {
  computeIOSContentOffset,
  getEffectiveHeight,
  getScrollEffective,
  getVisibleMinimumPaddingFraction,
  isScrollAtEnd,
  shouldShiftContent,
} from './helpers'

import type { UseChatKeyboardOptions, UseChatKeyboardReturn } from './types'
import type { AnimatedRef } from 'react-native-reanimated'
import type Reanimated from 'react-native-reanimated'

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
function useChatKeyboard(
  scrollViewRef: AnimatedRef<Reanimated.ScrollView>,
  options: UseChatKeyboardOptions
): UseChatKeyboardReturn {
  const {
    inverted,
    keyboardLiftBehavior,
    freeze,
    offset,
    blankSpace,
    extraContentPadding,
  } = options

  const padding = useSharedValue(0)
  const currentHeight = useSharedValue(0)
  const contentOffsetY = useSharedValue(options.initialContentOffsetY ?? 0)
  const targetKeyboardHeight = useSharedValue(0)
  const prevAbsorption = useSharedValue(0)
  const isInteractiveDismissal = useSharedValue(false)
  // Set by a transition that ran while frozen and so applied no content shift.
  const lastTransitionFrozen = useSharedValue(false)

  const {
    layout,
    size,
    offset: scroll,
    onLayout,
    onContentSizeChange,
  } = useScrollState(scrollViewRef, options.initialContentOffsetY)

  useKeyboardHandler(
    {
      onStart: (e) => {
        'worklet'

        if (freeze.value) {
          // eslint-disable-next-line react-compiler/react-compiler
          lastTransitionFrozen.value = true

          return
        }

        if (e.height > 0) {
          targetKeyboardHeight.value = e.height
        }

        if (lastTransitionFrozen.value) {
          // The frozen transition didn't shift the content: nothing to undo.
          lastTransitionFrozen.value = false
          prevAbsorption.value = padding.value
        }

        const effective = getEffectiveHeight(e.height, targetKeyboardHeight.value, offset)

        const atEnd = isScrollAtEnd(
          scroll.value,
          layout.value.height,
          size.value.height,
          inverted
        )

        // Scale minimum padding absorption by how much of it is visible.
        // Fully visible → full absorption; fully off-screen → no absorption.
        const visibleFraction = getVisibleMinimumPaddingFraction(
          scroll.value,
          layout.value.height,
          size.value.height,
          blankSpace.value,
          inverted
        )
        const visiblePadding = visibleFraction * blankSpace.value
        const minimumPaddingAbsorbed = Math.max(
          0,
          visiblePadding - extraContentPadding.value
        )
        const scrollEffective = getScrollEffective(effective, minimumPaddingAbsorbed)
        const actualTotalPadding = Math.max(
          blankSpace.value,
          effective + extraContentPadding.value
        )

        // `onInteractive` owns the native scroll offset. When its final
        // keyboardWillHide event arrives, consume the marker so this
        // transition only removes the inset and does not scroll programmatically.
        if (isInteractiveDismissal.value) {
          isInteractiveDismissal.value = false
          padding.value = effective
          prevAbsorption.value = minimumPaddingAbsorbed

          return
        }

        // persistent mode: when keyboard shrinks, clamp to valid range
        if (keyboardLiftBehavior === 'persistent' && effective < padding.value) {
          padding.value = effective
          prevAbsorption.value = minimumPaddingAbsorbed

          if (inverted) {
            const maxScroll = Math.max(size.value.height - layout.value.height, 0)

            contentOffsetY.value = Math.max(
              -actualTotalPadding,
              Math.min(scroll.value, maxScroll)
            )
          } else {
            const maxScroll = Math.max(
              size.value.height - layout.value.height + actualTotalPadding,
              0
            )

            contentOffsetY.value = Math.max(0, Math.min(scroll.value, maxScroll))
          }

          return
        }

        // never mode: when keyboard shrinks, clamp to valid range
        // to avoid ghost padding
        if (keyboardLiftBehavior === 'never' && effective < padding.value && atEnd) {
          padding.value = effective
          prevAbsorption.value = minimumPaddingAbsorbed

          if (inverted) {
            const maxScroll = Math.max(size.value.height - layout.value.height, 0)

            contentOffsetY.value = Math.max(
              -actualTotalPadding,
              Math.min(scroll.value, maxScroll)
            )
          } else {
            const maxScroll = Math.max(
              size.value.height - layout.value.height + actualTotalPadding,
              0
            )

            contentOffsetY.value = Math.max(0, Math.min(scroll.value, maxScroll))
          }

          return
        }

        // Undo only the scroll displacement that was actually applied
        // (not the full padding, which includes the absorbed portion).
        // Use the stored absorption from the previous event so that
        // the unwind matches the shift that was originally applied.
        const prevScrollEffective = getScrollEffective(
          padding.value,
          prevAbsorption.value
        )
        const relativeScroll = inverted
          ? scroll.value + prevScrollEffective
          : scroll.value - prevScrollEffective

        padding.value = effective
        prevAbsorption.value = minimumPaddingAbsorbed

        if (!shouldShiftContent(keyboardLiftBehavior, atEnd)) {
          // Preserve current scroll position so animated props
          // don't re-apply a stale contentOffset when padding changes
          contentOffsetY.value = scroll.value

          return
        }

        // When blankSpace fully absorbs the keyboard opening, preserve current scroll position
        // (only when keyboard is open — effective > 0 — not when closing)
        if (scrollEffective === 0 && minimumPaddingAbsorbed > 0 && effective > 0) {
          contentOffsetY.value = scroll.value

          return
        }

        contentOffsetY.value = computeIOSContentOffset(
          relativeScroll,
          scrollEffective,
          size.value.height,
          layout.value.height,
          inverted,
          actualTotalPadding
        )
      },
      onInteractive: () => {
        'worklet'

        isInteractiveDismissal.value = true
      },
      onMove: () => {
        'worklet'

        // iOS doesn't need per-frame updates (contentOffset handles it)
      },
      onEnd: (e) => {
        'worklet'

        if (freeze.value) {
          return
        }

        const effective = getEffectiveHeight(e.height, targetKeyboardHeight.value, offset)

        padding.value = effective
      },
    },
    [inverted, keyboardLiftBehavior, offset, extraContentPadding]
  )

  return {
    padding,
    currentHeight,
    contentOffsetY,
    scroll,
    layout,
    size,
    onLayout,
    onContentSizeChange,
  }
}

export { useChatKeyboard }
