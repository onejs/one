import type { AnimatedScrollViewComponent } from '../ScrollViewWithBottomPadding/index.js';
import type { ComponentRef } from 'react';
import type { ScrollView, ScrollViewProps } from 'react-native';
export type KeyboardAwareScrollViewMode = 'insets' | 'layout';
export type KeyboardAwareScrollViewProps = {
    /** The distance between the keyboard and the caret inside a focused `TextInput` when the keyboard is shown. Default is `0`. */
    bottomOffset?: number;
    /** Prevents automatic scrolling of the `ScrollView` when the keyboard gets hidden, maintaining the current screen position. Default is `false`. */
    disableScrollOnKeyboardHide?: boolean;
    /** Controls whether this `KeyboardAwareScrollView` instance should take effect. Default is `true`. */
    enabled?: boolean;
    /** Adjusting the bottom spacing of KeyboardAwareScrollView. Default is `0`. */
    extraKeyboardSpace?: number;
    /**
     * Controls how keyboard space is created at the bottom of the `ScrollView`.
     *
     * - `"insets"` *(default)*: Extends the scrollable area via `contentInset` (iOS) and `ClippingScrollView` (Android). No layout reflow occurs — content positions remain stable during keyboard animation. Recommended for most use cases.
     * - `"layout"`: Appends a spacer `View` as the last child of the `ScrollView`. The spacer participates in layout, so flex-based arrangements (e.g. `justifyContent: "space-between"`, `gap`) reflow naturally when the keyboard appears. Use this when you need content to physically rearrange around the keyboard space.
     *
     * Default is `"insets"`.
     */
    mode?: KeyboardAwareScrollViewMode;
    /** Custom component for `ScrollView`. Default is `ScrollView`. */
    ScrollViewComponent?: AnimatedScrollViewComponent;
} & ScrollViewProps;
export type KeyboardAwareScrollViewRef = {
    assureFocusedInputVisible: () => void;
} & ComponentRef<typeof ScrollView>;
//# sourceMappingURL=types.d.ts.map