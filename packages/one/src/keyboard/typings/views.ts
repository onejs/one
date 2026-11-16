import type { PropsWithChildren } from 'react'
import type { ViewProps } from 'react-native'

export type KeyboardGestureAreaProps = {
  /**
   * Determines how the keyboard position will be controlled:
   * - `ios` - keyboard will be following finger only when finger touches keyboard
   * - `linear` - keyboard will be following finger position linearly.
   *
   * @platform android
   */
  interpolator?: 'ios' | 'linear'
  /**
   * Whether to allow to show a keyboard from dismissed state by swipe up.
   * Default to `false`.
   *
   * @platform android
   */
  showOnSwipeUp?: boolean
  /**
   * Whether to allow to control a keyboard by gestures. The strategy how
   * it should be controlled is determined by `interpolator` property.
   * Defaults to `true`.
   *
   * @platform android
   */
  enableSwipeToDismiss?: boolean
  /**
   * Extra distance to the keyboard.
   */
  offset?: number
  /**
   * A corresponding `nativeID` value from the associated `TextInput` (a string that links the `KeyboardGestureArea` to one or more `TextInput` components).
   * This is **required on iOS** in order to apply the `offset` when the keyboard is shown. Only the currently focused `TextInput` with a matching `nativeID`
   * will receive offset behavior.
   *
   * @platform ios
   */
  textInputNativeID?: string
} & ViewProps
export type OverKeyboardViewProps = PropsWithChildren<{
  /**
   * A boolean prop indicating whether the view is visible or not. If it's true then view is shown on the screen. If it's false then view is hidden.
   */
  visible: boolean
}>
export type KeyboardBackgroundViewProps = PropsWithChildren<ViewProps>
export type KeyboardExtenderProps = PropsWithChildren<{
  /** Controls whether this `KeyboardExtender` instance should take an effect. Default is `true`. */
  enabled?: boolean
  /** Removes the keyboard-styled background (the glass capsule on iOS 26+) so the content draws its own surface. Default is `false`. */
  transparent?: boolean
}>
export type KeyboardToolbarGroupViewProps = PropsWithChildren<ViewProps>
export type ClippingScrollViewProps = PropsWithChildren<
  ViewProps & {
    /** An additional space that gets applied to the bottom of the `ScrollView` (inside a scrollable content). Default is `0`. */
    contentInsetBottom?: number
    /** An additional space that gets applied to the top of the `ScrollView` (inside a scrollable content). Default is `0`. */
    contentInsetTop?: number
    applyWorkaroundForContentInsetHitTestBug?: boolean
  }
>
