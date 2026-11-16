import { useCallback } from 'react'
import { Platform } from 'react-native'
import { useSharedValue } from 'react-native-reanimated'

import { IS_FABRIC } from '../../../architecture'
import { useAnimatedReaction } from '../../../reanimated'
import { safeScrollTo } from '../../utils/safeScrollTo'
import { isScrollAtEnd, shouldShiftContent } from '../useChatKeyboard/helpers'

import type { KeyboardLiftBehavior } from '../useChatKeyboard/types'
import type { AnimatedRef, SharedValue } from 'react-native-reanimated'
import type Reanimated from 'react-native-reanimated'

type UseExtraContentPaddingOptions = {
  scrollViewRef: AnimatedRef<Reanimated.ScrollView>
  extraContentPadding: SharedValue<number>
  /** Keyboard-only padding from useChatKeyboard — used to compute total padding for clamping. */
  keyboardPadding: SharedValue<number>
  /** Minimum inset floor — used to absorb keyboard and extraContentPadding changes. */
  blankSpace: SharedValue<number>
  /** Current vertical scroll offset. */
  scroll: SharedValue<number>
  /** Visible viewport dimensions. */
  layout: SharedValue<{ width: number; height: number }>
  /** Total content dimensions. */
  size: SharedValue<{ width: number; height: number }>
  /** IOS only — when provided, sets contentOffset atomically with contentInset. */
  contentOffsetY?: SharedValue<number>
  /** Lowest scroll offset, `-contentInset.top` on iOS. Defaults to `0`. */
  minScroll?: number
  inverted: boolean
  keyboardLiftBehavior: KeyboardLiftBehavior
  freeze: SharedValue<boolean>
}

const OS = Platform.OS

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
function useExtraContentPadding(options: UseExtraContentPaddingOptions): void {
  const {
    scrollViewRef,
    extraContentPadding,
    keyboardPadding,
    blankSpace,
    scroll,
    layout,
    size,
    contentOffsetY,
    minScroll = 0,
    inverted,
    keyboardLiftBehavior,
    freeze,
  } = options

  // used to calculate `base` (see explanation there)
  const lastCommanded = useSharedValue<number | null>(null)
  const lastObservedScroll = useSharedValue(0)

  const scrollToTarget = useCallback(
    (target: number) => {
      'worklet'

      // remember for the next frame (see `base` calculation)
      // eslint-disable-next-line react-compiler/react-compiler
      lastCommanded.value = target
      lastObservedScroll.value = scroll.value

      if (contentOffsetY && IS_FABRIC) {
        contentOffsetY.value = target
      } else if (OS === 'android') {
        // Defer scrollTo so the animatedProps inset commit lands first;
        // otherwise the native ScrollView clamps to the old range.
        requestAnimationFrame(() => {
          safeScrollTo(scrollViewRef, 0, target, false)
        })
      } else {
        safeScrollTo(scrollViewRef, 0, target, false)
      }
    },
    [scrollViewRef, contentOffsetY, scroll, lastCommanded, lastObservedScroll]
  )

  useAnimatedReaction(
    () => extraContentPadding.value,
    (current, previous) => {
      if (freeze.value || previous === null) {
        return
      }

      const rawDelta = current - previous

      if (rawDelta === 0) {
        return
      }

      // Compute effective delta considering blankSpace floor
      const previousTotal = Math.max(blankSpace.value, keyboardPadding.value + previous)
      const currentTotal = Math.max(blankSpace.value, keyboardPadding.value + current)
      // Native scroll offsets are pixel-rounded. Feeding their fractions back
      // into each animation step accumulates drift depending on frame timing.
      // Round absolute totals before subtracting so the total movement stays
      // consistent; rounding individual deltas would lose small changes.
      const effectiveDelta = Math.round(currentTotal) - Math.round(previousTotal)

      if (effectiveDelta === 0) {
        // blankSpace or rounding absorbed the change
        return
      }

      const atEnd = isScrollAtEnd(
        scroll.value,
        layout.value.height,
        size.value.height,
        inverted
      )

      // "persistent": scroll on grow, hold position on shrink (unless at end)
      if (keyboardLiftBehavior === 'persistent' && effectiveDelta < 0 && !atEnd) {
        return
      }

      if (!shouldShiftContent(keyboardLiftBehavior, atEnd)) {
        return
      }

      // Example: list is at 100 and `extraContentPadding` animates 0 -> 60,
      // 20px per frame. We want to scroll 100 -> 120 -> 140 -> 160.
      // But `scroll` is updated only when native scroll event arrives, and
      // it's slower than animation frames, so `scroll` can still be 100:
      //   frame 1: 100 + 20 = 120 ✅
      //   frame 2: 100 + 20 = 120 ❌ (should be 140)
      //   frame 3: 100 + 20 = 120 ❌ (should be 160)
      // To fix it, every `scrollToTarget` call saves:
      //   - `lastCommanded` - where we scrolled (120);
      //   - `lastObservedScroll` - what `scroll` was at that moment (100).
      // And on the next frame we pick the `base`:
      //   - `scroll` is still 100 -> it's outdated, so continue from
      //     `lastCommanded`: 120 + 20 = 140 ✅
      //   - `scroll` changed -> list really moved (or user scrolled),
      //     so use `scroll`.
      //   - `lastCommanded` is `null` -> we haven't scrolled yet, use `scroll`.
      // Limitation: this assumes that by the next frame `scroll` is either
      // unchanged or already shows our latest scroll. If it arrives with an
      // older one (we already asked for 140, but event says 120), we treat
      // it as a real move, continue from 120 and stay 20px behind.
      const base =
        lastCommanded.value !== null && scroll.value === lastObservedScroll.value
          ? lastCommanded.value
          : scroll.value

      let target: number

      if (inverted) {
        target = Math.max(base - effectiveDelta, -currentTotal)
      } else {
        const maxScroll = Math.max(
          size.value.height - layout.value.height + currentTotal,
          minScroll
        )

        // Clamp at `minScroll` as well: when the content is shorter than the
        // viewport a shrinking padding makes `effectiveDelta` negative while
        // `base` is already at `minScroll`, so the target would go below the
        // top of the content.
        target = Math.max(Math.min(base + effectiveDelta, maxScroll), minScroll)
      }

      scrollToTarget(target)
    },
    [inverted, keyboardLiftBehavior, minScroll]
  )
}

export { useExtraContentPadding }
export type { UseExtraContentPaddingOptions }
