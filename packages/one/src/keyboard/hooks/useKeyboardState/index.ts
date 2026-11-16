import { useEffect, useState } from 'react'

import { KeyboardEvents } from '../../bindings'
import { KeyboardController } from '../../module'

import type { IKeyboardState } from '../../typings'

const EVENTS = ['keyboardWillShow', 'keyboardDidHide'] as const

const getLatestState = () => ({
  ...KeyboardController.state(),
  isVisible: KeyboardController.isVisible(),
})

type KeyboardStateSelector<T> = (state: IKeyboardState) => T

const defaultSelector: KeyboardStateSelector<IKeyboardState> = (state) => state

/**
 * React Hook that represents the current keyboard state on iOS and Android.
 * It tracks keyboard visibility, height, appearance, type and other properties.
 * This hook subscribes to keyboard events and updates the state reactively.
 *
 * @template T - A type of the returned object from the `selector`.
 * @param selector - A function that receives the current keyboard state and picks only necessary properties to avoid frequent re-renders.
 * @returns Object {@link KeyboardState|containing} keyboard state information.
 * @see {@link https://kirillzyusko.github.io/react-native-keyboard-controller/docs/api/hooks/keyboard/use-keyboard-state|Documentation} page for more details.
 * @example
 * ```tsx
 * function MyComponent() {
 *   const isVisible = useKeyboardState((state) => state.isVisible);
 *   const height = useKeyboardState((state) => state.height);
 *
 *   return (
 *     <View>
 *       <Text>Keyboard is {isVisible ? 'visible' : 'hidden'}</Text>
 *       <Text>Keyboard height: {height}</Text>
 *     </View>
 *   );
 * }
 * ```
 */
function useKeyboardState<T = IKeyboardState>(
  selector: KeyboardStateSelector<T> = defaultSelector as KeyboardStateSelector<T>
): T {
  const [state, setState] = useState<T>(() => selector(getLatestState()))

  useEffect(() => {
    const subscriptions = EVENTS.map((event) =>
      KeyboardEvents.addListener(event, () =>
        // state will be updated by global listener first,
        // so we simply read it and don't derive data from the event
        setState(selector(getLatestState()))
      )
    )

    // we might have missed an update between reading a value in render and
    // `addListener` in this handler, so we set it here. If there was
    // no change, React will filter out this update as a no-op.
    setState(selector(getLatestState()))

    return () => {
      subscriptions.forEach((subscription) => subscription.remove())
    }
  }, [])

  return state
}

export { useKeyboardState }
