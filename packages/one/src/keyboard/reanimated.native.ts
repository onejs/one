import {
  useEvent,
  useAnimatedProps as useReanimatedAnimatedProps,
  useAnimatedReaction as useReanimatedAnimatedReaction,
  useAnimatedStyle as useReanimatedAnimatedStyle,
  useDerivedValue as useReanimatedDerivedValue,
  useHandler as useReanimatedHandler,
} from 'react-native-reanimated'

import type {
  EventWithName,
  FocusedInputLayoutChangedEvent,
  FocusedInputLayoutHandlerHook,
  KeyboardHandlerHook,
  NativeEvent,
} from './typings'

type EventContext = Record<string, unknown>

// Dependencies are only needed on Web when the Babel plugin is unavailable.
export const useAnimatedProps: typeof useReanimatedAnimatedProps = (
  updater,
  _dependencies,
  adapters,
  isAnimatedProps
) => useReanimatedAnimatedProps(updater, undefined, adapters, isAnimatedProps)
export const useAnimatedReaction: typeof useReanimatedAnimatedReaction = (
  prepare,
  react
) => useReanimatedAnimatedReaction(prepare, react)
export const useAnimatedStyle: typeof useReanimatedAnimatedStyle = (updater) =>
  useReanimatedAnimatedStyle(updater)
export const useDerivedValue: typeof useReanimatedDerivedValue = (updater) =>
  useReanimatedDerivedValue(updater)
export const useHandler: typeof useReanimatedHandler = (handlers) =>
  useReanimatedHandler(handlers)

export const useAnimatedKeyboardHandler: KeyboardHandlerHook<
  EventContext,
  EventWithName<NativeEvent>
> = (handlers, dependencies) => {
  const { context, doDependenciesDiffer } = useHandler(handlers, dependencies)

  return useEvent(
    (event) => {
      'worklet'
      const {
        onKeyboardMoveStart,
        onKeyboardMove,
        onKeyboardMoveEnd,
        onKeyboardMoveInteractive,
      } = handlers

      if (onKeyboardMoveStart && event.eventName.endsWith('onKeyboardMoveStart')) {
        onKeyboardMoveStart(event, context)
      }

      if (onKeyboardMove && event.eventName.endsWith('onKeyboardMove')) {
        onKeyboardMove(event, context)
      }

      if (onKeyboardMoveEnd && event.eventName.endsWith('onKeyboardMoveEnd')) {
        onKeyboardMoveEnd(event, context)
      }

      if (
        onKeyboardMoveInteractive &&
        event.eventName.endsWith('onKeyboardMoveInteractive')
      ) {
        onKeyboardMoveInteractive(event, context)
      }
    },
    [
      'onKeyboardMoveStart',
      'onKeyboardMove',
      'onKeyboardMoveEnd',
      'onKeyboardMoveInteractive',
    ],
    doDependenciesDiffer
  )
}

export const useFocusedInputLayoutHandler: FocusedInputLayoutHandlerHook<
  EventContext,
  EventWithName<FocusedInputLayoutChangedEvent>
> = (handlers, dependencies) => {
  const { context, doDependenciesDiffer } = useHandler(handlers, dependencies)

  return useEvent(
    (event) => {
      'worklet'
      const { onFocusedInputLayoutChanged } = handlers

      if (
        onFocusedInputLayoutChanged &&
        event.eventName.endsWith('onFocusedInputLayoutChanged')
      ) {
        onFocusedInputLayoutChanged(event, context)
      }
    },
    ['onFocusedInputLayoutChanged'],
    doDependenciesDiffer
  )
}
