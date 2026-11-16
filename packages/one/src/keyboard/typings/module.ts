import type { EmitterSubscription, TextInputProps } from 'react-native'

// Event module declarations
export type KeyboardControllerEvents =
  | 'keyboardWillShow'
  | 'keyboardDidShow'
  | 'keyboardWillHide'
  | 'keyboardDidHide'
export type KeyboardEventData = {
  /** Height of the keyboard. */
  height: number
  /** Duration of the keyboard animation. */
  duration: number
  /** Timestamp of the last keyboard event. */
  timestamp: number
  /** Tag of the focused `TextInput`. */
  target: number
  /** `keyboardType` property from focused `TextInput`. */
  type: NonNullable<TextInputProps['keyboardType']>
  /** Keyboard appearance. Can be one of `dark` or `light`. */
  appearance: 'dark' | 'light'
}
/**
 * An object that represent current keyboard state.
 */
export type IKeyboardState = {
  /** Whether the keyboard is currently visible. */
  isVisible: boolean
} & KeyboardEventData
export type KeyboardEventsModule = {
  /**
   * The `addListener` function connects a JavaScript function to an identified native
   * keyboard notification event.
   *
   * This function then returns the reference to the listener.
   *
   * `name` is the string that identifies the event you're listening for. This
   * can be any of the following:
   *
   * - `keyboardWillShow`;
   * - `keyboardDidShow`;
   * - `keyboardWillHide`;
   * - `keyboardDidHide`.
   */
  addListener: (
    name: KeyboardControllerEvents,
    cb: (e: KeyboardEventData) => void
  ) => EmitterSubscription
}
export type Direction = 'next' | 'prev' | 'current'
export type DismissOptions = {
  /**
   * A boolean property indicating whether focus should be kept on the input after dismissing the keyboard. Default is `false`.
   */
  keepFocus: boolean
  /**
   * A boolean property controlling whether dismissal should be animated. Default is `true`.
   */
  animated: boolean
}
export type KeyboardControllerModule = {
  // android only
  /**
   * Sets default `windowSoftInputMode` (the one that declared in `AndroidManifest.xml`).
   *
   * @platform android
   * @see {@link https://kirillzyusko.github.io/react-native-keyboard-controller/docs/api/keyboard-controller#setdefaultmode-|docs} page for more details.
   */
  setDefaultMode: () => void
  /**
   * Changes `windowSoftInputMode` on Android.
   *
   * @platform android
   * @see AndroidSoftInputModes for all possible values and {@link https://kirillzyusko.github.io/react-native-keyboard-controller/docs/api/keyboard-controller#setinputmode-|docs} page for more details.
   */
  setInputMode: (mode: number) => void
  // ios only
  /**
   * A method that preloads the keyboard. It's useful when you want to avoid a delay when the user focuses the first input.
   *
   * @platform ios
   * @see {@link https://kirillzyusko.github.io/react-native-keyboard-controller/docs/api/keyboard-controller#preload-|docs} page for more details.
   */
  preload: () => void
  /**
   * Sets the keyboard backdrop translucency.
   *
   * @platform ios
   */
  setTranslucent: (translucent: boolean) => void
  // all platforms
  /**
   * Dismisses the active keyboard. Removes a focus by default, but allows to pass `{keepFocus: true}` to keep focus.
   * If you want to close keyboard immediately pass `{animated: false}`.
   *
   * @see {@link https://kirillzyusko.github.io/react-native-keyboard-controller/docs/api/keyboard-controller#dismiss|docs} page for more details.
   */
  dismiss: (options?: Partial<DismissOptions>) => Promise<void>
  /**
   * Moves focus to the specified direction (`next`, `prev` or `current` to restore a focus).
   *
   * @see {@link https://kirillzyusko.github.io/react-native-keyboard-controller/docs/api/keyboard-controller#setfocusto|docs} page for more details.
   */
  setFocusTo: (direction: Direction) => void
  /**
   * Whether the keyboard is fully visible.
   *
   * @see {@link https://kirillzyusko.github.io/react-native-keyboard-controller/docs/api/keyboard-controller#isvisible|docs} page for more details.
   */
  isVisible: () => boolean
  /**
   * Method that returns current keyboard state.
   *
   * @see {@link https://kirillzyusko.github.io/react-native-keyboard-controller/docs/api/keyboard-controller#state|docs} page for more details.
   */
  state: () => KeyboardEventData
}
export type ViewPositionInWindowResult = {
  x: number
  y: number
  width: number
  height: number
}
export type KeyboardControllerNativeModule = {
  // android only
  setDefaultMode: () => void
  setInputMode: (mode: number) => void
  // ios only
  preload: () => void
  setTranslucent: (translucent: boolean) => void
  // all platforms
  dismiss: (keepFocus: boolean, animated: boolean) => void
  setFocusTo: (direction: Direction) => void
  viewPositionInWindow: (viewTag: number) => Promise<ViewPositionInWindowResult>
  readonly keyboardBorderRadius: number
}
