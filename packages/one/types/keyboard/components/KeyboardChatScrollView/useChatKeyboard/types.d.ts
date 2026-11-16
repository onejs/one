import type { LayoutChangeEvent } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
type KeyboardLiftBehavior = 'always' | 'whenAtEnd' | 'persistent' | 'never';
type UseChatKeyboardOptions = {
    inverted: boolean;
    keyboardLiftBehavior: KeyboardLiftBehavior;
    freeze: SharedValue<boolean>;
    offset: number;
    /** Lowest scroll offset, `-contentInset.top` on iOS. Defaults to `0`. */
    minScroll?: number;
    /** Initial JS scroll position, before the native scroll handler is attached. */
    initialContentOffsetY?: number;
    blankSpace: SharedValue<number>;
    /** Extra content padding shared value — needed on iOS to correctly clamp contentOffset. */
    extraContentPadding: SharedValue<number>;
};
type UseChatKeyboardReturn = {
    /** Extra scrollable space (= keyboard height). Used as contentInset on iOS, contentInsetBottom/contentInsetTop on Android. */
    padding: SharedValue<number>;
    /** Raw keyboard height updated every frame in onMove. Used to force Reanimated commits on Fabric. */
    currentHeight: SharedValue<number>;
    /** Absolute Y content offset for iOS (set once in onStart). `undefined` on Android. */
    contentOffsetY: SharedValue<number> | undefined;
    /** Current vertical scroll offset. */
    scroll: SharedValue<number>;
    /** Visible viewport dimensions. */
    layout: SharedValue<{
        width: number;
        height: number;
    }>;
    /** Total content dimensions. */
    size: SharedValue<{
        width: number;
        height: number;
    }>;
    /** Callback to attach to ScrollView's onLayout prop to capture initial viewport dimensions. */
    onLayout: (e: LayoutChangeEvent) => void;
    /** Callback to attach to ScrollView's onContentSizeChange prop to capture initial content dimensions. */
    onContentSizeChange: (w: number, h: number) => void;
};
export type { KeyboardLiftBehavior, UseChatKeyboardOptions, UseChatKeyboardReturn };
//# sourceMappingURL=types.d.ts.map