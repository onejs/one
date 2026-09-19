import { useImperativeHandle, useRef, useState, type Ref } from 'react'

import { Compose } from '../../compose.android'
import { useNativeState } from '../../syncNativeState'
import type { TextInputProps, TextInputRef } from './textInputTypes'
import {
  androidImeAction,
  androidKeyboardType,
  enterKeyHintToReturnKeyType,
  inputModeToKeyboardType,
  resolveEditable,
} from './textInputShared'

export function TextInput({
  ref,
  value,
  onChangeText,
  placeholder,
  autoFocus,
  editable: editableProp,
  readOnly,
  multiline,
  keyboardType: keyboardTypeProp,
  autoCapitalize,
  autoCorrect,
  returnKeyType: returnKeyTypeProp,
  inputMode,
  enterKeyHint,
  onSubmitEditing,
  onFocus,
  onBlur,
  defaultValue,
  testID,
  style,
  secureTextEntry,
  maxLength,
  textAlign,
}: TextInputProps & { ref?: Ref<TextInputRef> }) {
  const editable = resolveEditable(editableProp, readOnly)
  const keyboardType = keyboardTypeProp ?? inputModeToKeyboardType(inputMode)
  const returnKeyType =
    returnKeyTypeProp ?? enterKeyHintToReturnKeyType(enterKeyHint)

  const initialFallbackRef = useRef(defaultValue ?? '')
  const fallback = useNativeState<string>(initialFallbackRef.current)
  const state = value ?? fallback

  const [focused, setFocused] = useState(autoFocus ?? false)
  const [focusRevision, setFocusRevision] = useState(0)
  const isFocusedRef = useRef(autoFocus ?? false)
  useImperativeHandle(
    ref,
    () => ({
      focus: () => {
        setFocused(true)
        setFocusRevision((revision) => revision + 1)
      },
      blur: () => {
        setFocused(false)
        setFocusRevision((revision) => revision + 1)
      },
      clear: () => {
        state.set('')
      },
      isFocused: () => isFocusedRef.current,
      setSelection: (start: number, end?: number) => {
        void start
        void end
        console.warn(
          'TextInput.setSelection() is not supported on Android yet: it needs a ' +
            'TextFieldValue-backed field. This call was ignored.'
        )
        return Promise.resolve()
      },
    }),
    [state]
  )

  const handleFocusChange = (next: boolean) => {
    isFocusedRef.current = next
    setFocused(next)
    if (next) onFocus?.()
    else onBlur?.()
  }

  return (
    <Compose.TextField
      text={state}
      onTextChange={(text) => onChangeText?.(text)}
      placeholder={placeholder}
      disabled={!editable}
      secureText={secureTextEntry}
      focused={focused}
      focusRevision={focusRevision}
      onFocusChange={handleFocusChange}
      keyboardType={keyboardType ? androidKeyboardType(keyboardType) : undefined}
      imeAction={returnKeyType ? androidImeAction(returnKeyType) : undefined}
      onSubmit={onSubmitEditing ? () => onSubmitEditing(state.value) : undefined}
      maxLength={maxLength}
      multiline={multiline}
      capitalization={autoCapitalize}
      autoCorrect={autoCorrect}
      textAlign={textAlign === 'auto' ? undefined : textAlign}
      testID={testID}
      style={style}
    />
  )
}
