export declare const KeyboardState: {
    UNKNOWN: number;
    OPENING: number;
    OPEN: number;
    CLOSING: number;
    CLOSED: number;
};
/**
 * A compatibility layer for migration from https://docs.swmansion.com/react-native-reanimated/docs/device/useAnimatedKeyboard.
 *
 * @returns An object containing `height` and `state` properties represented as `SharedValue<number>`.
 * @example
 * ```ts
 * import { useAnimatedKeyboard, useAnimatedStyle } from 'react-native-keyboard-controller';
 *
 * export default function App() {
 *   const keyboard = useAnimatedKeyboard();
 *
 *   const animatedStyles = useAnimatedStyle(() => ({
 *     transform: [{ translateY: -keyboard.height.value }],
 *   }));
 * }
 */
export declare const useAnimatedKeyboard: () => {
    height: import("react-native-reanimated").SharedValue<number>;
    state: import("react-native-reanimated").SharedValue<number>;
};
//# sourceMappingURL=compat.d.ts.map