import { DeviceEventEmitter } from 'react-native'
import { NitroModules } from 'react-native-nitro-modules'

import OneClippingScrollViewDecoratorView from '../platform/specs/OneClippingScrollViewDecoratorViewNativeComponent'
import OneKeyboardBackgroundView from '../platform/specs/OneKeyboardBackgroundViewNativeComponent'
import OneKeyboardControllerView, {
  Commands as OneKeyboardControllerViewCommands,
} from '../platform/specs/OneKeyboardControllerViewNativeComponent'
import OneKeyboardExtender from '../platform/specs/OneKeyboardExtenderNativeComponent'
import OneKeyboardGestureArea from '../platform/specs/OneKeyboardGestureAreaNativeComponent'
import OneKeyboardToolbarGroupView from '../platform/specs/OneKeyboardToolbarGroupViewNativeComponent'
import OneOverKeyboardView from '../platform/specs/OneOverKeyboardViewNativeComponent'

import type { OneKeyboard } from '../platform/specs/OneKeyboard.nitro'
import type {
  ClippingScrollViewProps,
  FocusedInputEventsModule,
  KeyboardBackgroundViewProps,
  KeyboardControllerNativeModule,
  KeyboardControllerProps,
  KeyboardEventData,
  KeyboardEventsModule,
  KeyboardExtenderProps,
  KeyboardGestureAreaProps,
  KeyboardToolbarGroupViewProps,
  OverKeyboardViewProps,
  WindowDimensionsEventsModule,
} from './typings'
import type { EmitterSubscription } from 'react-native'

const native = NitroModules.createHybridObject<OneKeyboard>('OneKeyboard')

// react native's Animated listens for this to resync shadow nodes after a
// keyboard animation that ran natively.
native.addAnimationEndListener((tag) => {
  DeviceEventEmitter.emit('onUserDrivenAnimationEnded', { tags: [tag] })
})

const NOOP = () => {}

export const KeyboardControllerNative: KeyboardControllerNativeModule = {
  setDefaultMode: NOOP,
  setInputMode: NOOP,
  preload: () => native.preload(),
  setTranslucent: (translucent) => native.setTranslucent(translucent),
  dismiss: (keepFocus, animated) => native.dismiss(keepFocus, animated),
  setFocusTo: (direction) => native.setFocusTo(direction),
  viewPositionInWindow: (viewTag) => native.viewPositionInWindow(viewTag),
  get keyboardBorderRadius() {
    return native.keyboardBorderRadius
  },
}

// one native subscription per channel while any js listener holds it
function channel<Args extends unknown[]>(
  subscribe: (emit: (...args: Args) => void) => () => void
) {
  const listeners = new Set<(...args: Args) => void>()
  let stop: (() => void) | undefined
  return (listener: (...args: Args) => void) => {
    listeners.add(listener)
    stop ??= subscribe((...args) => {
      for (const each of [...listeners]) each(...args)
    })
    return {
      remove() {
        if (!listeners.delete(listener) || listeners.size) return
        stop?.()
        stop = undefined
      },
    } as EmitterSubscription
  }
}

const keyboard = channel<[string, KeyboardEventData]>((emit) =>
  native.addKeyboardListener((name, event) => emit(name, event as KeyboardEventData))
)
const focus = channel<[{ current: number; count: number }]>((emit) =>
  native.addFocusListener(emit)
)
const layoutSync = channel<[]>((emit) => native.addLayoutSyncListener(emit))
const windowResize = channel<[{ width: number; height: number }]>((emit) =>
  native.addWindowResizeListener((width, height) => emit({ width, height }))
)

export const KeyboardEvents: KeyboardEventsModule = {
  addListener: (name, cb) => keyboard((event, data) => event === name && cb(data)),
}

/**
 * This API is not documented, it's for internal usage only (for now), and is a subject to potential breaking changes in future.
 * Use it with cautious.
 */
export const FocusedInputEvents: FocusedInputEventsModule = {
  addListener: (name, cb) =>
    name === 'focusDidSet' ? focus(cb) : layoutSync(() => cb({ current: -1, count: 0 })),
}
export const WindowDimensionsEvents: WindowDimensionsEventsModule = {
  addListener: (_name, cb) => windowResize(cb),
}
export const KeyboardControllerView =
  OneKeyboardControllerView as unknown as React.FC<KeyboardControllerProps>
export { OneKeyboardControllerViewCommands as KeyboardControllerViewCommands }
export const KeyboardGestureArea =
  OneKeyboardGestureArea as unknown as React.FC<KeyboardGestureAreaProps>
export const RCTOverKeyboardView =
  OneOverKeyboardView as unknown as React.FC<OverKeyboardViewProps>
export const KeyboardBackgroundView =
  OneKeyboardBackgroundView as unknown as React.FC<KeyboardBackgroundViewProps>
export const RCTKeyboardExtender =
  OneKeyboardExtender as unknown as React.FC<KeyboardExtenderProps>
export const ClippingScrollView =
  OneClippingScrollViewDecoratorView as unknown as React.FC<ClippingScrollViewProps>
export const RCTKeyboardToolbarGroupView =
  OneKeyboardToolbarGroupView as unknown as React.FC<KeyboardToolbarGroupViewProps>
