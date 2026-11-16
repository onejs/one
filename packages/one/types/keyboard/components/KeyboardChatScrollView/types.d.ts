import type { AnimatedScrollViewComponent, ScrollViewContentInsets } from '../ScrollViewWithBottomPadding/index.js';
import type { KeyboardLiftBehavior } from './useChatKeyboard/types.js';
import type { ComponentRef } from 'react';
import type { ScrollView, ScrollViewProps } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
export type KeyboardChatScrollViewRef = ComponentRef<typeof ScrollView>;
export type KeyboardChatScrollViewProps = {
    /** Custom component for `ScrollView`. Default is `ScrollView`. */
    ScrollViewComponent?: AnimatedScrollViewComponent;
    /** Whether list are using `inverted` prop. Default is `false`. */
    inverted?: boolean;
    /**
     * The distance between the bottom of the screen and the `ScrollView`.
     * When the keyboard appears, the `ScrollView` will only push content by the effective
     * distance (`keyboardHeight - offset`) instead of the full keyboard height.
     *
     * Useful when the input is not at the very bottom of the screen (e.g., above safe area, above
     * bottom tabs, etc. - in this case offset should be equal to the height of the elements between
     * `ScrollView` and bottom of the screen).
     *
     * Default is `0`.
     */
    offset?: number;
    /**
     * Determines how the chat content should behave when the keyboard appears, specifically whether
     * the scroll view should automatically lift its content to keep it visible above the keyboard.
     *
     * Possible values:
     * - `'always'`: The content always lifts along with the keyboard, ensuring the messages from the bottom part of screen
     * remain visible regardless of the current scroll position. This is the default behavior for most chat applications (used in Telegram).
     * - `'whenAtEnd'`: The content lifts only if the scroll view is at the end (i.e., the last message
     * is visible or near the bottom). This prevents unnecessary adjustments when the user is scrolling
     * through older messages (ChatGPT mobile app behavior).
     * - `'persistent'`: The content always lifts when the keyboard appears (similar to `'always'`), but
     * does not reset (lower) when the keyboard hides. This mimics behaviors where the view remains adjusted
     * after keyboard dismissal to maintain focus on the latest content without shifting back (Claude mobile app behavior).
     * - `'never'`: The content does not lift at all when the keyboard appears. Use this for scenarios
     * when you don't want to disturb user attention with animations (Perplexity mobile app behavior).
     *
     * Default is `'always'`.
     */
    keyboardLiftBehavior?: KeyboardLiftBehavior;
    /**
     * When `true`, freezes all keyboard-driven layout changes (padding, content offset, scroll position).
     * Useful when dismissing the keyboard to open a bottom sheet — prevents visual disruption
     * while the sheet is visible.
     *
     * Default is `false`.
     */
    freeze?: boolean | SharedValue<boolean>;
    /**
     * A shared value representing additional padding from external elements
     * (e.g., a growing multiline `TextInput` in a `KeyboardStickyView`).
     *
     * When this value changes:
     * - The scrollable range is always extended/contracted (via `contentInset`).
     * - The scroll position is conditionally adjusted based on `keyboardLiftBehavior`.
     *
     * Default is `undefined` (no extra padding).
     */
    extraContentPadding?: SharedValue<number>;
    /**
     * When `true`, applies a runtime workaround for a React Native 0.81+ bug
     * where the ScrollView's `contentInset` area does not respond to touch/scroll
     * gestures (facebook/react-native#54123).
     *
     * This uses Objective-C runtime method swizzling on the ScrollView's container
     * view, which is inherently fragile. Only enable if you are affected by the
     * upstream bug and understand the risks.
     *
     * iOS only. Default is `false`.
     */
    applyWorkaroundForContentInsetHitTestBug?: boolean;
    /**
     * A shared value representing a minimum inset floor (in pixels).
     *
     * When set, the total bottom padding is computed as:
     * `max(blankSpace, keyboardPadding + extraContentPadding)`
     *
     * This means the keyboard "absorbs" into the minimum padding rather than adding to it:
     * - When `blankSpace >= keyboard + extraContentPadding`: content does NOT move on keyboard open/close.
     * - When `blankSpace < keyboard + extraContentPadding`: content moves, but only by the excess amount.
     *
     * Useful in AI chat apps where a sent message needs space below it (to push it to the top
     * of the viewport) while the AI response streams in, without that space causing extra movement
     * when the keyboard opens.
     *
     * Default is `undefined` (equivalent to `0` — no minimum floor).
     */
    blankSpace?: SharedValue<number>;
    /**
     * Fires whenever the effective content inset changes — the static `contentInset`
     * prop combined with the dynamic keyboard-driven padding.
     *
     * Useful on Android, where the synthetic content inset is not reflected in the native
     * `onScroll` event payload. Consumers such as virtualized lists computing their own
     * `scrollToEnd` target can use this to track the current inset alongside scroll offsets.
     */
    onContentInsetChange?: (insets: ScrollViewContentInsets) => void;
    /**
     * Fires whenever the visibility of the content "end" changes — both when the user
     * arrives at the end and when they leave it. The boolean parameter reflects the new state.
     *
     * For non-inverted lists, the "end" is the bottom of the content. For inverted lists
     * (`inverted={true}`), the "end" is the top of the scroll view, where the latest messages
     * are rendered. The same internal detection drives `keyboardLiftBehavior="whenAtEnd"`.
     *
     * The callback can be either a plain JS function or a Reanimated worklet — the type is
     * detected automatically. Worklets run on the UI thread; plain functions are dispatched
     * via `runOnJS`.
     *
     * Fires once on mount with the initial state (after the scroll view has been measured).
     */
    onEndVisible?: (visible: boolean) => void;
} & ScrollViewProps;
//# sourceMappingURL=types.d.ts.map