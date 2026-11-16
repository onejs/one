import type { HybridObject } from 'react-native-nitro-modules'

export type OneKeyboardEventName =
  | 'keyboardWillShow'
  | 'keyboardDidShow'
  | 'keyboardWillHide'
  | 'keyboardDidHide'

export interface OneKeyboardEvent {
  height: number
  duration: number
  timestamp: number
  target: number
  type: string
  appearance: string
}

export interface OneKeyboardFocus {
  current: number
  count: number
}

export interface OneKeyboardFrame {
  x: number
  y: number
  width: number
  height: number
}

// the module half of One's keyboard (one/keyboard), folded in from
// react-native-keyboard-controller. the views emit per-frame movement as
// fabric events; these listeners carry the lifecycle events.
export interface OneKeyboard extends HybridObject<{ ios: 'swift' }> {
  readonly keyboardBorderRadius: number
  preload(): void
  dismiss(keepFocus: boolean, animated: boolean): void
  setFocusTo(direction: string): void
  setTranslucent(translucent: boolean): void
  viewPositionInWindow(viewTag: number): Promise<OneKeyboardFrame>
  addKeyboardListener(
    listener: (name: OneKeyboardEventName, event: OneKeyboardEvent) => void
  ): () => void
  addFocusListener(listener: (event: OneKeyboardFocus) => void): () => void
  addLayoutSyncListener(listener: () => void): () => void
  addWindowResizeListener(listener: (width: number, height: number) => void): () => void
  addAnimationEndListener(listener: (viewTag: number) => void): () => void
}
