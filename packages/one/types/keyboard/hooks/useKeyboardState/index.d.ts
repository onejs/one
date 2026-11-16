import type { IKeyboardState } from '../../typings/index.js';
type KeyboardStateSelector<T> = (state: IKeyboardState) => T;
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
declare function useKeyboardState<T = IKeyboardState>(selector?: KeyboardStateSelector<T>): T;
export { useKeyboardState };
//# sourceMappingURL=index.d.ts.map