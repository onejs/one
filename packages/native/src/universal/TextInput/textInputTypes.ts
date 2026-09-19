import type {
  ColorValue,
  KeyboardTypeOptions,
  ReturnKeyTypeOptions,
  StyleProp,
  TextStyle,
  ViewProps,
  ViewStyle,
} from 'react-native'

import type { NativeState } from '../../syncNativeState'

// selection range, matching React Native's `selection` prop shape.
export type TextInputSelection = {
  start: number
  end?: number
}

// imperative handle, mirroring Expo's TextInput ref surface.
export type TextInputRef = {
  focus: () => void
  blur: () => void
  clear: () => void
  isFocused: () => boolean
  setSelection: (start: number, end?: number) => Promise<void>
}

// universal text input props, mirroring Expo's TextInput contract. `value`
// takes a NativeState handle: keystrokes land in the native entry
// synchronously, observed directly by the bound SwiftUI/Compose view, so the
// field stays correct without a React render.
//
// coverage in this slice: value, focus/blur/clear/isFocused, onFocus/onBlur,
// onSubmitEditing, keyboard/return mapping, secure entry, multiline, and
// maxLength work everywhere. props marked "web only" apply on web and are
// accepted-but-ignored on native until the backing control grows them;
// setSelection warns and resolves on native.
export type TextInputProps = Omit<
  ViewProps,
  'style' | 'pointerEvents' | 'children' | 'hitSlop'
> & {
  value?: NativeState<string>
  defaultValue?: string
  onChangeText?: (text: string) => void
  placeholder?: string
  autoFocus?: boolean
  editable?: boolean
  readOnly?: boolean
  multiline?: boolean
  // web only: native multiline grows without a line cap.
  numberOfLines?: number
  // web only: alias of numberOfLines.
  rows?: number
  // native iOS converges on the controlled round-trip; Android and web clamp
  // in-host.
  maxLength?: number
  secureTextEntry?: boolean
  keyboardType?: KeyboardTypeOptions
  inputMode?:
    | 'decimal'
    | 'email'
    | 'none'
    | 'numeric'
    | 'search'
    | 'tel'
    | 'text'
    | 'url'
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
  autoCorrect?: boolean
  // iOS and web; ignored on Android.
  autoComplete?: string
  returnKeyType?: ReturnKeyTypeOptions
  enterKeyHint?: 'enter' | 'done' | 'go' | 'next' | 'previous' | 'search' | 'send'
  onSubmitEditing?: (text: string) => void
  onFocus?: () => void
  onBlur?: () => void
  // web only.
  onContentSizeChange?: (size: { width: number; height: number }) => void
  // web only.
  onSelectionChange?: (selection: { start: number; end: number }) => void
  // web only.
  selection?: NativeState<TextInputSelection>
  // web only.
  selectTextOnFocus?: boolean
  // web only.
  selectionColor?: ColorValue
  // web only.
  selectionHandleColor?: ColorValue
  // web only.
  cursorColor?: ColorValue
  // web only.
  caretHidden?: boolean
  // web only.
  placeholderTextColor?: ColorValue
  // Android and web; ignored on iOS.
  textAlign?: 'auto' | 'left' | 'right' | 'center' | 'justify'
  // web only; native font styling is a follow-up.
  textStyle?: StyleProp<TextStyle>
  style?: StyleProp<ViewStyle>
  // accepted for React Native parity; ignored on every platform.
  underlineColorAndroid?: ColorValue
}
