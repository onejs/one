import { useCallback } from 'react'
import { useSharedValue } from 'react-native-reanimated'

import { useKeyboardHandler } from '../../../hooks'
import useScrollState from '../../hooks/useScrollState'
import { safeScrollTo } from '../../utils/safeScrollTo'

import {
  clampedScrollTarget,
  getEffectiveHeight,
  getMinimumPaddingAbsorbed,
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
  const offsetBeforeScroll = useSharedValue(0)
  const targetKeyboardHeight = useSharedValue(0)
  const closing = useSharedValue(false)
  const minimumPaddingFractionOnOpen = useSharedValue(0)
  const actualOpenShift = useSharedValue(0)
  const {
    layout,
    size,
    offset: scroll,
    onLayout,
    onContentSizeChange,
  } = useScrollState(scrollViewRef)
  const clampScrollIfNeeded = useCallback(
    (effective: number, totalPaddingForMaxScroll?: number) => {
      'worklet'

      const paddingForMax =
        totalPaddingForMaxScroll !== undefined ? totalPaddingForMaxScroll : effective
      const maxScroll = Math.max(
        size.value.height - layout.value.height + paddingForMax,
        0
      )

      if (scroll.value > maxScroll) {
        safeScrollTo(scrollViewRef, 0, maxScroll, false)
      }
    },
    [scrollViewRef, scroll, layout, size]
  )

  useKeyboardHandler(
    {
      onStart: (e) => {
        'worklet'

        if (freeze.value) {
          if (!inverted) {
            // The frozen transition doesn't shift the content, so the next
            // one must not undo a shift (same sentinel as "whenAtEnd").
            // eslint-disable-next-line react-compiler/react-compiler
            offsetBeforeScroll.value = -1
          }

          return
        }

        if (e.height > 0) {
          targetKeyboardHeight.value = e.height
          closing.value = false
        } else {
          closing.value = true
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
        const minimumPaddingAbsorbed =
          visibleFraction >= 1
            ? getMinimumPaddingAbsorbed(blankSpace.value, extraContentPadding.value)
            : 0
        const scrollEffective = getScrollEffective(effective, minimumPaddingAbsorbed)

        if (inverted && e.duration === -1) {
          // Android inverted: skip post-interactive snap-back events
          // (duration === -1 means the keyboard is re-establishing its
          // position after an interactive gesture, not a real animation)
          return
        } else if (e.height > 0) {
          // Android: keyboard opening — set padding + capture scroll position
          minimumPaddingFractionOnOpen.value = visibleFraction >= 1 ? 1 : 0
          padding.value = effective
          offsetBeforeScroll.value = scroll.value

          if (!inverted && keyboardLiftBehavior === 'whenAtEnd' && !atEnd) {
            // Sentinel: don't scroll in onMove (non-inverted only)
            offsetBeforeScroll.value = -1
          } else if (!inverted && scrollEffective === 0) {
            // blankSpace fully absorbs the keyboard — prevent scroll
            offsetBeforeScroll.value = -1
          } else if (inverted && scrollEffective === 0) {
            // blankSpace fully absorbs the keyboard — guard for inverted
            offsetBeforeScroll.value = scroll.value
          }
        } else {
          // Android: keyboard closing — re-capture scroll position
          if (inverted) {
            offsetBeforeScroll.value = scroll.value
          } else {
            // Preserve "whenAtEnd" sentinel: if open didn't shift, close shouldn't either
            if (offsetBeforeScroll.value !== -1) {
              // Use the actual displacement recorded at end of open animation
              // (not the theoretical value) so close is symmetric with open
              offsetBeforeScroll.value = scroll.value - actualOpenShift.value
            }
          }
        }
      },
      onMove: (e) => {
        'worklet'

        if (freeze.value) {
          return
        }

        currentHeight.value = e.height

        if (inverted) {
          // Skip post-interactive snap-back (duration === -1)
          if (e.duration === -1) {
            return
          }

          const effective = getEffectiveHeight(
            e.height,
            targetKeyboardHeight.value,
            offset
          )

          const minimumPaddingAbsorbed =
            getMinimumPaddingAbsorbed(blankSpace.value, extraContentPadding.value) *
            minimumPaddingFractionOnOpen.value
          const scrollEffective = getScrollEffective(effective, minimumPaddingAbsorbed)
          const actualTotalPadding = Math.max(
            blankSpace.value,
            effective + extraContentPadding.value
          )

          // Check if we should shift content based on position when keyboard started
          const wasAtEnd = isScrollAtEnd(
            offsetBeforeScroll.value,
            layout.value.height,
            size.value.height,
            inverted
          )

          // "never" at end: scroll along when keyboard closes to avoid jump
          if (keyboardLiftBehavior === 'never' && wasAtEnd && effective < padding.value) {
            padding.value = effective

            if (scrollEffective === 0 && minimumPaddingAbsorbed > 0) {
              return
            }

            safeScrollTo(scrollViewRef, 0, 0, false)

            return
          }

          if (!shouldShiftContent(keyboardLiftBehavior, wasAtEnd)) {
            // Closing, not shifting: reduce padding to avoid gap
            if (closing.value && effective < padding.value) {
              padding.value = effective
              clampScrollIfNeeded(effective, actualTotalPadding)
            }

            return
          }

          // When blankSpace fully absorbs the keyboard, skip scroll
          if (scrollEffective === 0 && minimumPaddingAbsorbed > 0) {
            return
          }

          // Persistent: don't let shift decrease
          if (keyboardLiftBehavior === 'persistent') {
            const currentShift = offsetBeforeScroll.value + padding.value - scroll.value

            if (effective < currentShift) {
              // When at end, allow scrolling back (snap to end + reduce padding)
              if (wasAtEnd) {
                padding.value = effective
                safeScrollTo(scrollViewRef, 0, 0, false)
              } else if (closing.value) {
                // Not at end: reduce padding to avoid gap
                padding.value = effective
                clampScrollIfNeeded(effective, actualTotalPadding)
              }

              return
            }
          }

          const target = offsetBeforeScroll.value + padding.value - scrollEffective

          safeScrollTo(scrollViewRef, 0, target, false)
        } else {
          const effective = getEffectiveHeight(
            e.height,
            targetKeyboardHeight.value,
            offset
          )

          const minimumPaddingAbsorbed =
            getMinimumPaddingAbsorbed(blankSpace.value, extraContentPadding.value) *
            minimumPaddingFractionOnOpen.value
          const scrollEffective = getScrollEffective(effective, minimumPaddingAbsorbed)
          const actualTotalPadding = Math.max(
            blankSpace.value,
            effective + extraContentPadding.value
          )

          // "never" closing: clamp scroll to valid range as inset shrinks
          if (
            keyboardLiftBehavior === 'never' &&
            closing.value &&
            effective < padding.value
          ) {
            clampScrollIfNeeded(effective, actualTotalPadding)

            return
          }

          if (!shouldShiftContent(keyboardLiftBehavior, true)) {
            return
          }

          // "whenAtEnd" sentinel check (also used for blankSpace full absorption)
          if (offsetBeforeScroll.value === -1) {
            if (closing.value) {
              // Keyboard didn't shift on open; ensure valid position on close
              clampScrollIfNeeded(effective, actualTotalPadding)
            }

            return
          }

          // "persistent" closing: maintain position, clamped to valid range
          if (keyboardLiftBehavior === 'persistent' && closing.value) {
            const keepAt = offsetBeforeScroll.value + padding.value
            const maxScroll = Math.max(
              size.value.height - layout.value.height + actualTotalPadding,
              0
            )

            safeScrollTo(scrollViewRef, 0, Math.min(keepAt, maxScroll), false)

            return
          }

          const target = clampedScrollTarget(
            offsetBeforeScroll.value,
            scrollEffective,
            size.value.height,
            layout.value.height,
            actualTotalPadding
          )

          safeScrollTo(scrollViewRef, 0, target, false)

          // Track actual (clamped) displacement during open for symmetric close
          if (!closing.value) {
            actualOpenShift.value = target - offsetBeforeScroll.value
          }
        }
      },
      onEnd: (e) => {
        'worklet'

        if (freeze.value) {
          return
        }

        const effective = getEffectiveHeight(e.height, targetKeyboardHeight.value, offset)

        padding.value = effective

        // Record actual scroll displacement so close can be symmetric
        if (effective > 0 && offsetBeforeScroll.value !== -1) {
          actualOpenShift.value = scroll.value - offsetBeforeScroll.value
        } else if (effective === 0) {
          // Fully closed: a later close event (Android sends one when a Modal
          // gives the focus back) must not reuse the previous shift
          actualOpenShift.value = 0
        }
      },
    },
    [inverted, keyboardLiftBehavior, offset]
  )

  return {
    padding,
    currentHeight,
    contentOffsetY: undefined,
    scroll,
    layout,
    size,
    onLayout,
    onContentSizeChange,
  }
}

export { useChatKeyboard }
