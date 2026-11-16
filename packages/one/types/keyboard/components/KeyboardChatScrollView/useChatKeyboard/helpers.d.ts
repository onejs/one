import type { KeyboardLiftBehavior } from './types.js';
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
export declare const getEffectiveHeight: (height: number, targetKeyboardHeight: number, offset: number) => number;
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
export declare const isScrollAtEnd: (scrollOffset: number, layoutHeight: number, contentHeight: number, inverted?: boolean) => boolean;
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
export declare const shouldShiftContent: (behavior: KeyboardLiftBehavior, isAtEnd: boolean) => boolean;
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
export declare const getVisibleMinimumPaddingFraction: (scrollOffset: number, layoutHeight: number, contentHeight: number, blankSpace: number, inverted: boolean) => number;
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
export declare const getMinimumPaddingAbsorbed: (blankSpace: number, extraContentPadding: number) => number;
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
export declare const getScrollEffective: (rawEffective: number, minimumPaddingAbsorbed: number) => number;
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
export declare const clampedScrollTarget: (offsetBeforeScroll: number, keyboardHeight: number, contentHeight: number, layoutHeight: number, totalPaddingForMaxScroll?: number) => number;
/**
 * Compute contentOffset.y for iOS lists.
 *
 * @param relativeScroll - Scroll position relative to current inset.
 * @param keyboardHeight - Target keyboard height (used for scroll displacement).
 * @param contentHeight - Total height of the scrollable content.
 * @param layoutHeight - Visible height of the scroll view.
 * @param inverted - Whether the list is inverted.
 * @param totalPaddingForMaxScroll - Total padding to use for maxScroll calculation. When provided, used instead of keyboardHeight for the scrollable range. Defaults to keyboardHeight.
 * @param minScroll - Lowest scroll offset for non-inverted lists (`-contentInset.top`). Defaults to 0.
 * @returns The absolute contentOffset.y to set.
 * @example
 * ```ts
 * computeIOSContentOffset(100, 300, 1000, 800, false); // 400
 * ```
 */
export declare const computeIOSContentOffset: (relativeScroll: number, keyboardHeight: number, contentHeight: number, layoutHeight: number, inverted: boolean, totalPaddingForMaxScroll?: number, minScroll?: number) => number;
//# sourceMappingURL=helpers.d.ts.map