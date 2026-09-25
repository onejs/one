import { useImperativeHandle, useRef, useState, type Ref } from 'react'

import { SecureField, TextField } from '../../generated/Controls.native'
import type { TextFieldProps as SwiftTextFieldProps } from '../../generated/controlTypes'
import { useNativeState } from '../../syncNativeState'
import type { TextInputProps, TextInputRef } from './textInputTypes'
import {
  applyMaxLength,
  autoCompleteToTextContentType,
  enterKeyHintToReturnKeyType,
  inputModeToKeyboardType,
  iosKeyboardType,
  iosSubmitLabel,
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
  autoComplete,
  maxLength,
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
          secureTextEntry
            ? "TextInput.setSelection() was ignored: SwiftUI's SecureField doesn't expose " +
                'programmatic selection. Remove `secureTextEntry` if you need to apply ' +
                'selection changes.'
            : 'TextInput.setSelection() is not supported on iOS yet: it needs a ' +
                'UITextField-backed field. This call was ignored.'
        )
        return Promise.resolve()
      },
    }),
    [secureTextEntry, state]
  )

  const handleFocusChange = (next: boolean) => {
    isFocusedRef.current = next
    setFocused(next)
    if (next) onFocus?.()
    else onBlur?.()
  }

  const handleTextChange = (text: string) => {
    // the generated field has no native maxLength clamp, so over-length
    // keystrokes converge on the controlled round-trip instead of in-host.
    const next = applyMaxLength(text, maxLength)
    if (next !== text) state.set(next)
    onChangeText?.(next)
  }

  const handleSubmit = () => {
    onSubmitEditing?.(state.value)
  }

  const fieldProps: Omit<SwiftTextFieldProps, 'axis' | 'revision'> = {
    text: state,
    onTextChange: handleTextChange,
    focused,
    onFocusChange: handleFocusChange,
    focusRevision,
    onSubmit: onSubmitEditing ? handleSubmit : undefined,
    prompt: placeholder,
    disabled: !editable,
    submitLabel: returnKeyType ? iosSubmitLabel(returnKeyType) : undefined,
    textInputAutocapitalization:
      autoCapitalize === 'none' ? 'never' : autoCapitalize,
    autocorrectionDisabled: autoCorrect === false,
    keyboardType: keyboardType ? iosKeyboardType(keyboardType) : undefined,
    textContentType: autoCompleteToTextContentType(autoComplete),
    testID,
    style,
  }

  if (secureTextEntry) {
    return <SecureField {...fieldProps} />
  }
  return <TextField {...fieldProps} axis={multiline ? 'vertical' : 'horizontal'} />
}
