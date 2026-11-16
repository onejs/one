import { createContext, useContext } from 'react'
import { Animated } from 'react-native'

import type { FocusedInputLayoutChangedEvent } from './typings'
import type React from 'react'
import type { EventHandlerProcessed, SharedValue } from 'react-native-reanimated'

export type AnimatedContext = {
  /**
   * A value between `0` and `1` indicating keyboard position, where `0` means keyboard is closed and `1` means keyboard is fully visible.
   * Represented as `Animated.Value`.
   */
  progress: Animated.Value
  /** Height of the keyboard. Represented as `Animated.Value`. */
  height: Animated.AnimatedMultiplication<number>
}
export type ReanimatedContext = {
  /**
   * A value between `0` and `1` indicating keyboard position, where `0` means keyboard is closed and `1` means keyboard is fully visible.
   * Represented as `SharedValue`.
   */
  progress: SharedValue<number>
  /** Height of the keyboard. Represented as `SharedValue`. */
  height: SharedValue<number>
}
export type KeyboardAnimationContext = {
  /** Whether KeyboardController library is active or not. */
  enabled: boolean
  /** Object that stores animated values that reflect the keyboard’s current position and movement. */
  animated: AnimatedContext
  /** Object that stores reanimated values that reflect the keyboard’s current position and movement. */
  reanimated: ReanimatedContext
  /** Layout of the focused `TextInput` represented as `SharedValue`. */
  layout: SharedValue<FocusedInputLayoutChangedEvent | null>
  /** Method for updating info about focused input layout. */
  update: () => Promise<void>
  /** Method for setting workletized keyboard handlers. */
  setKeyboardHandlers: (handlers: EventHandlerProcessed<never, never>) => () => void
  /** Method for setting workletized handlers for tracking focused input events. */
  setInputHandlers: (handlers: EventHandlerProcessed<never, never>) => () => void
  /** Method to enable/disable KeyboardController library. */
  setEnabled: React.Dispatch<React.SetStateAction<boolean>>
}
const NOOP = () => {}
const NESTED_NOOP = () => NOOP
const withSharedValue = <T>(value: T): SharedValue<T> => ({
  value,
  addListener: NOOP,
  removeListener: NOOP,
  modify: NOOP,
  get: () => value,
  set: NOOP,
})
const DEFAULT_SHARED_VALUE = withSharedValue(0)
const DEFAULT_LAYOUT = withSharedValue<FocusedInputLayoutChangedEvent | null>(null)
const defaultContext: KeyboardAnimationContext = {
  enabled: true,
  animated: {
    progress: new Animated.Value(0),
    height: new Animated.Value(0),
  },
  reanimated: {
    progress: DEFAULT_SHARED_VALUE,
    height: DEFAULT_SHARED_VALUE,
  },
  layout: DEFAULT_LAYOUT,
  update: Promise.resolve,
  setKeyboardHandlers: NESTED_NOOP,
  setInputHandlers: NESTED_NOOP,
  setEnabled: NOOP,
}

export const KeyboardContext = createContext(defaultContext)

/**
 * A hook that returns a reference to {@link KeyboardAnimationContext} object.
 *
 * @returns Object {@link KeyboardAnimationContext|containing} keyboard-controller context.
 * @example
 * ```ts
 *   const context = useKeyboardContext();
 *
 *   useLayoutEffect(() => {
 *     const cleanup = context.setInputHandlers(handler);
 *
 *     return () => cleanup();
 *   }, deps);
 * ```
 */
export const useKeyboardContext = () => {
  const context = useContext(KeyboardContext)

  if (__DEV__ && context === defaultContext) {
    console.warn(
      "Couldn't find real values for `KeyboardContext`. Please make sure you're inside of `KeyboardProvider` - otherwise functionality of `one/keyboard` will not work."
    )
  }

  return context
}
