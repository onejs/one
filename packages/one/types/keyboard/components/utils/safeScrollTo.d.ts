import { scrollTo } from 'react-native-reanimated';
/**
 * Scrolls only while the animated ref has a native view attached.
 * Supports callable UI refs (Reanimated < 4.7) and object UI refs (4.7+).
 *
 * @param animatedRef - Animated ref attached to the scroll view.
 * @param x - Horizontal scroll offset.
 * @param y - Vertical scroll offset.
 * @param animated - Whether to animate the scroll.
 * @example safeScrollTo(scrollViewRef, 0, 100, false);
 */
export declare const safeScrollTo: typeof scrollTo;
//# sourceMappingURL=safeScrollTo.d.ts.map