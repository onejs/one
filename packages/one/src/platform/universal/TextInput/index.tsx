import {
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type Ref,
} from 'react'
import type { KeyboardTypeOptions, ReturnKeyTypeOptions } from 'react-native'

import { useNativeState } from '../../syncNativeState'
import { domStyle } from '../../web/DomView'
import type { TextInputProps, TextInputRef } from './textInputTypes'
import { resolveEditable } from './textInputShared'

// web draws an input or a textarea, so no web bundle needs react-native-web.
// the reset matches the one react-native-web gave these fields, so layouts
// built against it keep their size.
const RESET: CSSProperties = {
  appearance: 'none',
  backgroundColor: 'transparent',
  borderStyle: 'solid',
  borderWidth: 0,
  borderColor: 'black',
  borderRadius: 0,
  boxSizing: 'border-box',
  font: '14px system-ui, -apple-system, sans-serif',
  margin: 0,
  padding: 0,
  resize: 'none',
}

const DEFAULT: CSSProperties = {
  padding: 8,
  borderWidth: 1,
  borderColor: '#d1d5db',
  borderRadius: 6,
}

// ::placeholder and ::selection take no inline style, so one shared rule
// reads the colors from custom properties on each field.
const PSEUDO_RULES = `[data-one-text-input]::placeholder{color:var(--one-placeholder)}[data-one-text-input]::selection{background-color:var(--one-selection)}`

function keyboardTypeToInputMode(
  keyboardType: KeyboardTypeOptions | undefined
): TextInputProps['inputMode'] {
  switch (keyboardType) {
    case 'email-address':
      return 'email'
    case 'number-pad':
    case 'numeric':
      return 'numeric'
    case 'decimal-pad':
      return 'decimal'
    case 'phone-pad':
      return 'tel'
    case 'web-search':
      return 'search'
    case 'url':
      return 'url'
    default:
      return undefined
  }
}

function returnKeyTypeToEnterKeyHint(
  returnKeyType: ReturnKeyTypeOptions | undefined
): TextInputProps['enterKeyHint'] {
  switch (returnKeyType) {
    case 'done':
    case 'go':
    case 'next':
    case 'previous':
    case 'search':
    case 'send':
      return returnKeyType
    default:
      return undefined
  }
}

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
  keyboardType,
  autoCapitalize,
  autoCorrect = true,
  autoComplete,
  returnKeyType,
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
  nativeID,
  accessibilityLabel,
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
  const [focused, setFocused] = useState(false)
  const initialFallbackRef = useRef(defaultValue ?? '')
  const fallback = useNativeState<string>(initialFallbackRef.current)
  const state = value ?? fallback

  const innerRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null)
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
      isFocused: () => innerRef.current != null && document.activeElement === innerRef.current,
      setSelection: (start: number, end?: number) => {
        if (selection) selection.set({ start, end })
        else innerRef.current?.setSelectionRange(start, end ?? start)
        return Promise.resolve()
      },
    }),
    [state, selection]
  )

  const selectionValue = selection?.value
  useLayoutEffect(() => {
    const node = innerRef.current
    if (!node || !selectionValue) return
    node.setSelectionRange(selectionValue.start, selectionValue.end ?? selectionValue.start)
  }, [selectionValue?.start, selectionValue?.end])

  const contentSize = useRef({ width: 0, height: 0 })
  useLayoutEffect(() => {
    const node = innerRef.current
    if (!node || !onContentSizeChange) return
    const width = node.scrollWidth
    const height = node.scrollHeight
    if (width === contentSize.current.width && height === contentSize.current.height) return
    contentSize.current = { width, height }
    onContentSizeChange({ width, height })
  }, [state.value, onContentSizeChange])

  const caretColor = caretHidden ? 'transparent' : (cursorColor ?? selectionColor)
  const fieldStyle: CSSProperties = {
    ...RESET,
    ...DEFAULT,
    ...(focused && { borderColor: '#3b82f6' }),
    ...(multiline && { minHeight: 80 }),
    ...domStyle(style),
    ...domStyle(textStyle),
    ...(textAlign && textAlign !== 'auto' && { textAlign }),
    ...(caretColor != null && { caretColor: String(caretColor) }),
    ['--one-placeholder' as string]: String(placeholderTextColor ?? '#6b7280'),
    ...(selectionColor != null && { ['--one-selection' as string]: String(selectionColor) }),
  }

  const shared = {
    ref: innerRef,
    'data-one-text-input': '',
    'data-testid': testID,
    id: nativeID,
    'aria-label': accessibilityLabel,
    value: state.value,
    placeholder,
    autoFocus,
    readOnly: !editable,
    maxLength,
    inputMode: inputMode ?? keyboardTypeToInputMode(keyboardType),
    enterKeyHint: enterKeyHint ?? returnKeyTypeToEnterKeyHint(returnKeyType),
    autoCapitalize,
    autoCorrect: autoCorrect ? 'on' : 'off',
    spellCheck: autoCorrect,
    autoComplete,
    style: fieldStyle,
    onChange: (event: { currentTarget: { value: string } }) => {
      const text = event.currentTarget.value
      state.set(text)
      onChangeText?.(text)
    },
    onFocus: () => {
      setFocused(true)
      if (selectTextOnFocus) innerRef.current?.select()
      onFocus?.()
    },
    onBlur: () => {
      setFocused(false)
      onBlur?.()
    },
    onSelect: (event: { currentTarget: { selectionStart: number | null; selectionEnd: number | null } }) => {
      if (!onSelectionChange && !selection) return
      const next = {
        start: event.currentTarget.selectionStart ?? 0,
        end: event.currentTarget.selectionEnd ?? 0,
      }
      selection?.set(next)
      onSelectionChange?.(next)
    },
  }

  return (
    <>
      <style href="one-text-input" precedence="default">
        {PSEUDO_RULES}
      </style>
      {multiline ? (
        <textarea {...shared} rows={numberOfLinesProp ?? rows} />
      ) : (
        <input
          {...shared}
          type={secureTextEntry ? 'password' : 'text'}
          onKeyDown={(event) => {
            // a single-line field submits on enter and gives up focus, as it
            // did through react-native-web.
            if (event.key !== 'Enter' || event.nativeEvent.isComposing) return
            onSubmitEditing?.(event.currentTarget.value)
            event.currentTarget.blur()
          }}
        />
      )}
    </>
  )
}
