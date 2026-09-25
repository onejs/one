import { useImperativeHandle, useRef, useState, type Ref } from 'react'
import {
  StyleSheet,
  TextInput as RNTextInput,
  type TextInput as RNTextInputType,
  type TextInputProps as RNTextInputProps,
} from 'react-native'

import { useNativeState } from '../../syncNativeState'
import type { TextInputProps, TextInputRef } from './textInputTypes'
import {
  enterKeyHintToReturnKeyType,
  inputModeToKeyboardType,
  resolveEditable,
} from './textInputShared'

const styles = StyleSheet.create({
  input: {
    padding: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
  },
  focused: {
    borderColor: '#3b82f6',
  },
  multiline: {
    minHeight: 80,
  },
})

export function TextInput({
  ref,
  value,
  onChangeText,
  placeholder,
  placeholderTextColor,
  autoFocus,
  editable: editableProp,
  readOnly,
  multiline,
  keyboardType: keyboardTypeProp,
  autoCapitalize,
  autoCorrect,
  autoComplete,
  returnKeyType: returnKeyTypeProp,
  inputMode,
  enterKeyHint,
  onSubmitEditing,
  onFocus,
  onBlur,
  onContentSizeChange,
  onSelectionChange,
  selection,
  selectTextOnFocus,
  defaultValue,
  numberOfLines: numberOfLinesProp,
  rows,
  testID,
  style,
  textStyle,
  secureTextEntry,
  maxLength,
  caretHidden,
  selectionColor,
  cursorColor,
  textAlign,
}: TextInputProps & { ref?: Ref<TextInputRef> }) {
  const editable = resolveEditable(editableProp, readOnly)
  const numberOfLines = numberOfLinesProp ?? rows
  const keyboardType = keyboardTypeProp ?? inputModeToKeyboardType(inputMode)
  const returnKeyType =
    returnKeyTypeProp ?? enterKeyHintToReturnKeyType(enterKeyHint)

  const [focused, setFocused] = useState(false)
  const initialFallbackRef = useRef(defaultValue ?? '')
  const fallback = useNativeState<string>(initialFallbackRef.current)
  const state = value ?? fallback

  const innerRef = useRef<RNTextInputType>(null)
  useImperativeHandle(
    ref,
    () => ({
      focus: () => {
        innerRef.current?.focus()
      },
      blur: () => {
        innerRef.current?.blur()
      },
      clear: () => {
        state.set('')
      },
      isFocused: () => innerRef.current?.isFocused() ?? false,
      setSelection: (start: number, end?: number) => {
        if (selection) selection.set({ start, end })
        else innerRef.current?.setSelection(start, end ?? start)
        return Promise.resolve()
      },
    }),
    [state, selection]
  )

  return (
    <RNTextInput
      ref={innerRef}
      value={state.value}
      placeholder={placeholder}
      placeholderTextColor={placeholderTextColor ?? '#6b7280'}
      autoFocus={autoFocus}
      editable={editable}
      readOnly={readOnly}
      multiline={multiline}
      numberOfLines={numberOfLines}
      secureTextEntry={secureTextEntry}
      autoComplete={autoComplete as RNTextInputProps['autoComplete']}
      maxLength={maxLength}
      caretHidden={caretHidden}
      selectionColor={selectionColor}
      testID={testID}
      keyboardType={keyboardType}
      inputMode={inputMode}
      autoCapitalize={autoCapitalize}
      autoCorrect={autoCorrect}
      returnKeyType={returnKeyType}
      enterKeyHint={enterKeyHint}
      cursorColor={cursorColor}
      onSubmitEditing={
        onSubmitEditing ? (e) => onSubmitEditing(e.nativeEvent.text) : undefined
      }
      onFocus={() => {
        setFocused(true)
        onFocus?.()
      }}
      onBlur={() => {
        setFocused(false)
        onBlur?.()
      }}
      onChangeText={(text) => {
        state.set(text)
        onChangeText?.(text)
      }}
      onContentSizeChange={
        onContentSizeChange
          ? (e) => onContentSizeChange(e.nativeEvent.contentSize)
          : undefined
      }
      selectTextOnFocus={selectTextOnFocus}
      selection={selection?.value}
      onSelectionChange={
        onSelectionChange
          ? (e) => {
              const next = e.nativeEvent.selection
              if (selection) selection.set(next)
              onSelectionChange(next)
            }
          : selection
            ? (e) => {
                selection.set(e.nativeEvent.selection)
              }
            : undefined
      }
      style={[
        styles.input,
        focused && styles.focused,
        multiline && styles.multiline,
        style,
        textStyle,
        textAlign && textAlign !== 'auto' ? { textAlign } : null,
      ]}
    />
  )
}
