import { useSharedValue } from 'react-native-reanimated'

import { useKeyboardHandler } from './hooks'

export const KeyboardState = {
  UNKNOWN: 0,
  OPENING: 1,
  OPEN: 2,
  CLOSING: 3,
  CLOSED: 4,
}

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
export const useAnimatedKeyboard = () => {
  const height = useSharedValue(0)
  const state = useSharedValue(KeyboardState.UNKNOWN)

  useKeyboardHandler(
    {
      onStart: (e) => {
        'worklet'

        state.set(e.height > 0 ? KeyboardState.OPENING : KeyboardState.CLOSING)
      },
      onMove: (e) => {
        'worklet'

        height.set(e.height)
      },
      onInteractive: (e) => {
        'worklet'

        height.set(e.height)
      },
      onEnd: (e) => {
        'worklet'

        state.set(e.height > 0 ? KeyboardState.OPEN : KeyboardState.CLOSED)
        height.set(e.height)
      },
    },
    []
  )

  return { height, state }
}
