import { Animated } from 'react-native';
import { findNodeHandle } from './utils/findNodeHandle/index.js';
import type { EventHandlerProcessed } from 'react-native-reanimated';
type ComponentOrHandle = Parameters<typeof findNodeHandle>[0];
/**
 * An internal hook that helps to register workletized event handlers.
 *
 * @param viewTagRef - Ref to the view that produces events.
 * @returns A function that registers supplied event handlers.
 * @example
 * ```ts
 * const setKeyboardHandlers = useEventHandlerRegistration<KeyboardHandler>(
 *     keyboardEventsMap,
 *     viewTagRef,
 * );
 * ```
 */
export declare function useEventHandlerRegistration(viewTagRef: React.MutableRefObject<ComponentOrHandle>): (handler: EventHandlerProcessed<never, never>) => () => void;
/**
 * TS variant of `useAnimatedValue` hook which is added in RN 0.71
 * A better alternative of storing animated values in refs, since
 * it doesn't recreate a new `Animated.Value` object on every re-render
 * and therefore consumes less memory. We can not use a variant from
 * RN, since this library supports earlier versions of RN.
 *
 * @param initialValue - Initial value of the animated value (numeric).
 * @param config - Additional {@link Animated.AnimatedConfig|configuration} for the animated value.
 * @returns Properly memoized {@link Animated.Value|Animated} value.
 * @see https://github.com/facebook/react-native/commit/e22217fe8b9455e32695f88ca835e11442b0a937
 * @example
 * ```ts
 * const progress = useAnimatedValue(0);
 * ```
 */
export declare function useAnimatedValue(initialValue: number, config?: Animated.AnimatedConfig): Animated.Value;
export {};
//# sourceMappingURL=internal.d.ts.map