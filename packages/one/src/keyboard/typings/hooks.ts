import type { NativeSyntheticEvent, ViewProps } from 'react-native'

// DirectEventHandler events declaration
export type NativeEvent = {
  /** A value between `0` and `1` indicating keyboard position, where `0` means keyboard is closed and `1` means keyboard is fully visible. */
  progress: number
  /** Height of the keyboard. */
  height: number
  /** Duration of the keyboard animation. */
  duration: number
  /** Tag of the focused `TextInput`. */
  target: number
}
export type FocusedInputLayoutChangedEvent = {
  /** Tag of the focused `TextInput`. */
  target: number
  /** Tag of the parent `ScrollView`. */
  parentScrollViewTarget: number
  layout: {
    /** X coordinate of the focused `TextInput`. */
    x: number
    /** Y coordinate of the focused `TextInput`. */
    y: number
    /** Width of the focused `TextInput`. */
    width: number
    /** Height of the focused `TextInput`. */
    height: number
    /** X coordinate of the focused `TextInput` relative to the screen. */
    absoluteX: number
    /** Y coordinate of the focused `TextInput` relative to the screen. */
    absoluteY: number
    /**
     * X coordinate of the focused `TextInput` inside the content of the parent `ScrollView`
     * (`0` if there is no parent `ScrollView`).
     */
    contentX: number
    /**
     * Y coordinate of the focused `TextInput` inside the content of the `ScrollView`,
     * doesn't depend on the scroll offset (`0` if there is no parent `ScrollView`).
     */
    contentY: number
  }
}
export type FocusedInputTextChangedEvent = {
  /** Text that user typed in the focused `TextInput`. */
  text: string
}
export type FocusedInputSelectionChangedEvent = {
  /** Tag of the focused `TextInput`. */
  target: number
  selection: {
    /** Start of the selection. Represents top-left point of rectangle. */
    start: {
      /** X coordinate of the selection start (relative to the `TextInput`). */
      x: number
      /** Y coordinate of the selection start (relative to the `TextInput`). */
      y: number
      /** The start of selection. */
      position: number
    }
    /** End of the selection. Represents bottom-right point of rectangle. */
    end: {
      /** X coordinate of the selection end (relative to the `TextInput`). */
      x: number
      /** Y coordinate of the selection end (relative to the `TextInput`). */
      y: number
      /** The end of selection. */
      position: number
    }
  }
}
export type EventWithName<T> = {
  eventName: string
} & T

// native View/Module declarations
export type KeyboardControllerProps = {
  //ref prop
  ref?: React.Ref<React.Component<KeyboardControllerProps>>
  // callback props
  onKeyboardMoveStart?: (e: NativeSyntheticEvent<EventWithName<NativeEvent>>) => void
  onKeyboardMove?: (e: NativeSyntheticEvent<EventWithName<NativeEvent>>) => void
  onKeyboardMoveEnd?: (e: NativeSyntheticEvent<EventWithName<NativeEvent>>) => void
  onKeyboardMoveInteractive?: (
    e: NativeSyntheticEvent<EventWithName<NativeEvent>>
  ) => void
  onFocusedInputLayoutChanged?: (
    e: NativeSyntheticEvent<EventWithName<FocusedInputLayoutChangedEvent>>
  ) => void
  onFocusedInputTextChanged?: (
    e: NativeSyntheticEvent<EventWithName<FocusedInputTextChangedEvent>>
  ) => void
  onFocusedInputSelectionChanged?: (
    e: NativeSyntheticEvent<EventWithName<FocusedInputSelectionChangedEvent>>
  ) => void
  // fake props used to activate reanimated bindings
  onKeyboardMoveReanimated?: (e: NativeSyntheticEvent<EventWithName<NativeEvent>>) => void
  onFocusedInputLayoutChangedReanimated?: (
    e: NativeSyntheticEvent<EventWithName<FocusedInputLayoutChangedEvent>>
  ) => void
  onFocusedInputTextChangedReanimated?: (
    e: NativeSyntheticEvent<EventWithName<FocusedInputTextChangedEvent>>
  ) => void
  onFocusedInputSelectionChangedReanimated?: (
    e: NativeSyntheticEvent<EventWithName<FocusedInputSelectionChangedEvent>>
  ) => void
  // props
  statusBarTranslucent?: boolean
  navigationBarTranslucent?: boolean
  preserveEdgeToEdge?: boolean
  enabled?: boolean
} & ViewProps

// reanimated hook declaration
export type KeyboardHandlerHook<TContext, Event> = (
  handlers: {
    onKeyboardMoveStart?: (e: NativeEvent, context: TContext) => void
    onKeyboardMove?: (e: NativeEvent, context: TContext) => void
    onKeyboardMoveEnd?: (e: NativeEvent, context: TContext) => void
    onKeyboardMoveInteractive?: (e: NativeEvent, context: TContext) => void
  },
  dependencies?: unknown[]
) => (e: NativeSyntheticEvent<Event>) => void
export type FocusedInputLayoutHandlerHook<TContext, Event> = (
  handlers: {
    onFocusedInputLayoutChanged?: (
      e: FocusedInputLayoutChangedEvent,
      context: TContext
    ) => void
  },
  dependencies?: unknown[]
) => (e: NativeSyntheticEvent<Event>) => void
export type FocusedInputTextHandlerHook<TContext, Event> = (
  handlers: {
    onFocusedInputTextChanged?: (
      e: FocusedInputTextChangedEvent,
      context: TContext
    ) => void
  },
  dependencies?: unknown[]
) => (e: NativeSyntheticEvent<Event>) => void
export type FocusedInputSelectionHandlerHook<TContext, Event> = (
  handlers: {
    onFocusedInputSelectionChanged?: (
      e: FocusedInputSelectionChangedEvent,
      context: TContext
    ) => void
  },
  dependencies?: unknown[]
) => (e: NativeSyntheticEvent<Event>) => void

// package types
export type Handlers<T> = Record<string, T | undefined>
export type KeyboardHandler = Partial<{
  /**
   * A callback that gets invoked when keyboard starts its movement.
   * The event contains DESTINATION values.
   *
   * @example
   * ```ts
   * onStart: (e) => {
   *   "worklet";
   *
   *   const willKeyboardAppear = e.progress === 1;
   * }
   * ```
   */
  onStart: (e: NativeEvent) => void
  /**
   * A callback that gets involved every frame when keyboard changes its position.
   *
   * @example
   * ```ts
   * onMove: (e) => {
   *   "worklet";
   *
   *   const keyboardHeight = e.height;
   * }
   */
  onMove: (e: NativeEvent) => void
  /**
   * A callback that gets invoked when keyboard finished its movement.
   *
   * @example
   * ```ts
   * onEnd: (e) => {
   *   "worklet";
   *
   *   const isKeyboardShown = e.progress === 1;
   * }
   * ```
   */
  onEnd: (e: NativeEvent) => void
  /**
   * A callback that gets invoked every frame when keyboard changes its position due to interactive dismissal.
   *
   * @example
   * ```ts
   * onInteractive: (e) => {
   *   "worklet";
   *
   *   const keyboardHeight = e.height;
   * }
   */
  onInteractive: (e: NativeEvent) => void
}>
export type KeyboardHandlers = Handlers<KeyboardHandler>
export type FocusedInputHandler = Partial<{
  /** A callback that gets invoked every time when the text changes in focused input. */
  onChangeText: (e: FocusedInputTextChangedEvent) => void
  /** A callback that gets invoked every time when the selection (cursor) coordinates change in focused input. */
  onSelectionChange: (e: FocusedInputSelectionChangedEvent) => void
}>
export type FocusedInputHandlers = Handlers<FocusedInputHandler>
