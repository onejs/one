import { interpolate } from 'react-native-reanimated'

import type { KeyboardLiftBehavior } from './types'

const AT_END_THRESHOLD = 20

/**
 * Map the current keyboard height to an effective height that accounts for a
 * fixed offset (e.g. Bottom safe-area or tab-bar height)..
 *
 * @param height - Current keyboard height.
 * @param targetKeyboardHeight - Full target keyboard height (captured on keyboard open).
 * @param offset - Fixed distance between the scroll-view bottom and the screen bottom.
 * @returns Effective height after subtracting the offset proportionally.
 * @example
 * ```ts
 * getEffectiveHeight(300, 300, 50); // 250
 * getEffectiveHeight(150, 300, 50); // 125
 * ```
 */
export const getEffectiveHeight = (
  height: number,
  targetKeyboardHeight: number,
  offset: number
): number => {
  'worklet'

  if (offset === 0 || targetKeyboardHeight === 0) {
    return height
  }

  return interpolate(
    height,
    [0, targetKeyboardHeight],
    [0, Math.max(targetKeyboardHeight - offset, 0)]
  )
}

/**
 * Check whether the scroll view is at the end of its content.
 *
 * For non-inverted lists the "end" is the bottom of the content.
 * For inverted lists the "end" is the top (scroll offset near 0),
 * because that is where the latest messages are displayed.
 *
 * @param scrollOffset - Current vertical scroll offset.
 * @param layoutHeight - Visible height of the scroll view.
 * @param contentHeight - Total height of the scrollable content.
 * @param inverted - Whether the list is inverted.
 * @returns `true` if the scroll position is within the threshold of the content end.
 * @example
 * ```ts
 * const atEnd = isScrollAtEnd(100, 800, 920); // true (100 + 800 >= 920 - 20)
 * const atEndInverted = isScrollAtEnd(5, 800, 2000, true); // true (5 <= 20)
 * ```
 */
export const isScrollAtEnd = (
  scrollOffset: number,
  layoutHeight: number,
  contentHeight: number,
  inverted: boolean = false
): boolean => {
  'worklet'

  if (inverted) {
    return scrollOffset <= AT_END_THRESHOLD
  }

  return scrollOffset + layoutHeight >= contentHeight - AT_END_THRESHOLD
}

/**
 * Decide whether content should be shifted based on the keyboard lift behavior.
 *
 * @param behavior - The configured keyboard lift behavior.
 * @param isAtEnd - Whether the scroll view is currently at the end.
 * @returns `true` if content should be shifted.
 * @example
 * ```ts
 * shouldShiftContent("always", false); // true
 * shouldShiftContent("whenAtEnd", false); // false
 * ```
 */
export const shouldShiftContent = (
  behavior: KeyboardLiftBehavior,
  isAtEnd: boolean
): boolean => {
  'worklet'

  switch (behavior) {
    case 'always':
      return true
    case 'never':
      return false
    case 'whenAtEnd':
      return isAtEnd
    case 'persistent':
      return true
  }
}

/**
 * Compute the fraction of minimum padding space currently visible in the viewport (0–1).
 *
 * The minimum padding space lives in the scroll view's contentInset, NOT in the
 * content itself.  So `contentHeight` (from onContentSizeChange / scroll
 * events) does **not** include it.  The visible portion is how far the
 * viewport extends past the content boundary into the inset area.
 *
 * For non-inverted lists the padding is in contentInset.bottom.
 * For inverted lists the padding is in contentInset.top (negative scroll).
 *
 * @param scrollOffset - Current vertical scroll offset.
 * @param layoutHeight - Visible height of the scroll view.
 * @param contentHeight - Height of the scroll content (excludes insets).
 * @param blankSpace - Size of the minimum padding inset area.
 * @param inverted - Whether the list is inverted.
 * @returns A value between 0 (padding fully off-screen) and 1 (padding fully visible).
 * @example
 * ```ts
 * // Non-inverted: contentHeight=1500, layout=800, blankSpace=300
 * getVisibleMinimumPaddingFraction(1500, 800, 1500, 300, false); // 1   (at end, viewport past content)
 * getVisibleMinimumPaddingFraction(850, 800, 1500, 300, false);  // 0.5 (half padding visible)
 * getVisibleMinimumPaddingFraction(700, 800, 1500, 300, false);  // 0   (padding off-screen)
 * ```
 */
export const getVisibleMinimumPaddingFraction = (
  scrollOffset: number,
  layoutHeight: number,
  contentHeight: number,
  blankSpace: number,
  inverted: boolean
): number => {
  'worklet'

  if (blankSpace <= 0) {
    return 0
  }

  if (inverted) {
    // Minimum padding is in contentInset.top; visible when scroll < 0
    return Math.max(0, Math.min(1, -scrollOffset / blankSpace))
  }

  // Minimum padding is in contentInset.bottom; visible when viewport extends past content
  const pastContentEnd = scrollOffset + layoutHeight - contentHeight

  return Math.max(0, Math.min(1, pastContentEnd / blankSpace))
}

/**
 * Compute how much of the minimum content padding absorbs the keyboard + extraContentPadding.
 *
 * @param blankSpace - Minimum inset floor.
 * @param extraContentPadding - Extra content padding from external elements.
 * @returns The portion of blankSpace that absorbs keyboard displacement.
 * @example
 * ```ts
 * getMinimumPaddingAbsorbed(500, 20); // 480
 * getMinimumPaddingAbsorbed(0, 20);   // 0
 * ```
 */
export const getMinimumPaddingAbsorbed = (
  blankSpace: number,
  extraContentPadding: number
): number => {
  'worklet'

  return Math.max(0, blankSpace - extraContentPadding)
}

/**
 * Compute the effective scroll displacement after minimum padding absorption.
 *
 * @param rawEffective - Raw effective keyboard height.
 * @param minimumPaddingAbsorbed - Amount absorbed by minimum content padding.
 * @returns The scroll displacement after subtracting the absorbed portion.
 * @example
 * ```ts
 * getScrollEffective(300, 200); // 100
 * getScrollEffective(300, 400); // 0
 * ```
 */
export const getScrollEffective = (
  rawEffective: number,
  minimumPaddingAbsorbed: number
): number => {
  'worklet'

  return Math.max(0, rawEffective - minimumPaddingAbsorbed)
}

/**
 * Compute the clamped scroll target for non-inverted lists.
 *
 * @param offsetBeforeScroll - Scroll position before keyboard appeared.
 * @param keyboardHeight - Current keyboard height (used for scroll displacement).
 * @param contentHeight - Total height of the scrollable content.
 * @param layoutHeight - Visible height of the scroll view.
 * @param totalPaddingForMaxScroll - Total padding to use for maxScroll calculation. When provided, used instead of keyboardHeight for the scrollable range. Defaults to keyboardHeight.
 * @returns Clamped scroll target between 0 and maxScroll.
 * @example
 * ```ts
 * clampedScrollTarget(100, 300, 1000, 800); // 400
 * clampedScrollTarget(100, 100, 1000, 800, 500); // 200, maxScroll uses 500
 * ```
 */
export const clampedScrollTarget = (
  offsetBeforeScroll: number,
  keyboardHeight: number,
  contentHeight: number,
  layoutHeight: number,
  totalPaddingForMaxScroll?: number
): number => {
  'worklet'

  const paddingForMax =
    totalPaddingForMaxScroll !== undefined ? totalPaddingForMaxScroll : keyboardHeight
  const maxScroll = Math.max(contentHeight - layoutHeight + paddingForMax, 0)

  return Math.min(Math.max(offsetBeforeScroll + keyboardHeight, 0), maxScroll)
}

/**
 * Compute contentOffset.y for iOS lists.
 *
 * @param relativeScroll - Scroll position relative to current inset.
 * @param keyboardHeight - Target keyboard height (used for scroll displacement).
 * @param contentHeight - Total height of the scrollable content.
 * @param layoutHeight - Visible height of the scroll view.
 * @param inverted - Whether the list is inverted.
 * @param totalPaddingForMaxScroll - Total padding to use for maxScroll calculation. When provided, used instead of keyboardHeight for the scrollable range. Defaults to keyboardHeight.
 * @returns The absolute contentOffset.y to set.
 * @example
 * ```ts
 * computeIOSContentOffset(100, 300, 1000, 800, false); // 400
 * ```
 */
export const computeIOSContentOffset = (
  relativeScroll: number,
  keyboardHeight: number,
  contentHeight: number,
  layoutHeight: number,
  inverted: boolean,
  totalPaddingForMaxScroll?: number
): number => {
  'worklet'

  const paddingForMax =
    totalPaddingForMaxScroll !== undefined ? totalPaddingForMaxScroll : keyboardHeight

  if (inverted) {
    const maxScroll = Math.max(contentHeight - layoutHeight, 0)

    return Math.max(Math.min(relativeScroll - keyboardHeight, maxScroll), -paddingForMax)
  }

  const maxScroll = Math.max(contentHeight - layoutHeight + paddingForMax, 0)

  return Math.min(Math.max(keyboardHeight + relativeScroll, 0), maxScroll)
}
