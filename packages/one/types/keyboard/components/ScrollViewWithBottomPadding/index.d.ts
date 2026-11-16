import React from 'react';
import Reanimated from 'react-native-reanimated';
import type { ScrollViewProps } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
type AnimatedScrollViewProps = React.ComponentProps<typeof Reanimated.ScrollView>;
export type AnimatedScrollViewComponent = React.ComponentType<AnimatedScrollViewProps & React.RefAttributes<Reanimated.ScrollView>>;
export type ScrollViewContentInsets = {
    top: number;
    bottom: number;
    left: number;
    right: number;
};
declare const ScrollViewWithBottomPadding: React.ForwardRefExoticComponent<{
    ScrollViewComponent: AnimatedScrollViewComponent;
    children?: React.ReactNode;
    inverted?: boolean;
    bottomPadding: SharedValue<number>;
    /** Padding for scroll indicator insets (excludes blankSpace). Falls back to bottomPadding when not provided. */
    scrollIndicatorPadding?: SharedValue<number>;
    /** Absolute Y content offset (iOS only, for KeyboardChatScrollView). */
    contentOffsetY?: SharedValue<number>;
    applyWorkaroundForContentInsetHitTestBug?: boolean;
    /**
     * Fires whenever the effective content inset changes (combines the static `contentInset`
     * prop with the dynamic keyboard-driven padding). Useful on Android where the synthetic
     * inset is not reflected in `onScroll` events.
     */
    onContentInsetChange?: (insets: ScrollViewContentInsets) => void;
} & ScrollViewProps & React.RefAttributes<Reanimated.ScrollView>>;
export default ScrollViewWithBottomPadding;
//# sourceMappingURL=index.d.ts.map