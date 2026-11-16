import { useRef } from 'react'
import { Animated } from 'react-native'

import { findNodeHandle } from './utils/findNodeHandle'

import type { EventHandlerProcessed } from 'react-native-reanimated'

type ComponentOrHandle = Parameters<typeof findNodeHandle>[0]

type WorkletHandler = {
  registerForEvents: (viewTag: number) => void
  unregisterFromEvents: (viewTag: number) => void
}

type WorkletHandlerContainer =
  | {
      current: WorkletHandler
    }
  | {
      workletEventHandler: WorkletHandler
    }

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
export function useEventHandlerRegistration(
  viewTagRef: React.MutableRefObject<ComponentOrHandle>
) {
  const onRegisterHandler = (handler: EventHandlerProcessed<never, never>) => {
    const currentHandler = handler as unknown as WorkletHandlerContainer
    let registeredViewTag: number | null = null
    let isRegistrationCancelled = false
    const attachWorkletHandlers = () => {
      if (isRegistrationCancelled) {
        return
      }

      const viewTag = findNodeHandle(viewTagRef.current)

      if (__DEV__ && !viewTag) {
        console.warn(
          'Can not attach worklet handlers for `one/keyboard` because view tag can not be resolved. Be sure that `KeyboardProvider` is fully mounted before registering handlers. If you think it is a bug in library, please open an issue.'
        )
      }

      if (viewTag) {
        if ('workletEventHandler' in currentHandler) {
          currentHandler.workletEventHandler.registerForEvents(viewTag)
        } else {
          currentHandler.current.registerForEvents(viewTag)
        }

        registeredViewTag = viewTag
      }
    }

    if (viewTagRef.current) {
      attachWorkletHandlers()
    } else {
      // view may not be mounted yet - defer registration until call-stack becomes empty
      queueMicrotask(attachWorkletHandlers)
    }

    return () => {
      isRegistrationCancelled = true

      if (registeredViewTag) {
        if ('workletEventHandler' in currentHandler) {
          currentHandler.workletEventHandler.unregisterFromEvents(registeredViewTag)
        } else {
          currentHandler.current.unregisterFromEvents(registeredViewTag)
        }
      }
    }
  }

  return onRegisterHandler
}

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
export function useAnimatedValue(
  initialValue: number,
  config?: Animated.AnimatedConfig
): Animated.Value {
  const ref = useRef<Animated.Value | null>(null)

  if (ref.current === null) {
    ref.current = new Animated.Value(initialValue, config)
  }

  return ref.current
}
