import type { EmitterSubscription } from 'react-native'

export type FocusedInputAvailableEvents = 'focusDidSet' | 'layoutDidSynchronize'
export type FocusedInputEventData = {
  current: number
  count: number
}
export type FocusedInputEventsModule = {
  addListener: (
    name: FocusedInputAvailableEvents,
    cb: (e: FocusedInputEventData) => void
  ) => EmitterSubscription
}
export type WindowDimensionsAvailableEvents = 'windowDidResize'
export type WindowDimensionsEventData = {
  width: number
  height: number
}
export type WindowDimensionsEventsModule = {
  addListener: (
    name: WindowDimensionsAvailableEvents,
    cb: (e: WindowDimensionsEventData) => void
  ) => EmitterSubscription
}
