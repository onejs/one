import { useEffect, useRef, useState } from 'react'
import type {
  KeyboardTypeOptions,
  ReturnKeyTypeOptions,
} from 'react-native'

import type { SDKKeyboardType, SDKSubmitLabel, SDKTextContentType } from '../../generated/controlTypes'
import type { TextInputProps } from './textInputTypes'

// shared mappings for the universal TextInput, mirroring Expo's utils plus
// the platform keyboard/return tables from their iOS and Android inputs.

export function resolveEditable(
  editable: boolean | undefined,
  readOnly: boolean | undefined
): boolean {
  if (readOnly) return false
  return editable ?? true
}

export function inputModeToKeyboardType(
  inputMode: TextInputProps['inputMode']
): KeyboardTypeOptions | undefined {
  switch (inputMode) {
    case 'decimal':
      return 'decimal-pad'
    case 'email':
      return 'email-address'
    case 'none':
      return 'default'
    case 'numeric':
      return 'numeric'
    case 'search':
      return 'web-search'
    case 'tel':
      return 'phone-pad'
    case 'text':
      return 'default'
    case 'url':
      return 'url'
    default:
      return undefined
  }
}

export function enterKeyHintToReturnKeyType(
  enterKeyHint: TextInputProps['enterKeyHint']
): ReturnKeyTypeOptions | undefined {
  switch (enterKeyHint) {
    case 'enter':
      return 'default'
    case 'done':
      return 'done'
    case 'go':
      return 'go'
    case 'next':
      return 'next'
    case 'previous':
      return 'previous'
    case 'search':
      return 'search'
    case 'send':
      return 'send'
    default:
      return undefined
  }
}

// web autocomplete tokens to the swiftStyle textContentType values, with off as
// null. unmapped tokens apply nothing: swiftStyle rejects unknown values, so
// unlike Expo this never passes one through.
const autoCompleteMap: Record<string, SDKTextContentType | null> = {
  'additional-name': 'middleName',
  'address-line1': 'streetAddressLine1',
  'address-line2': 'streetAddressLine2',
  bday: 'birthdate',
  'bday-day': 'birthdateDay',
  'bday-month': 'birthdateMonth',
  'bday-year': 'birthdateYear',
  'cc-additional-name': 'creditCardName',
  'cc-csc': 'creditCardSecurityCode',
  'cc-exp': 'creditCardExpiration',
  'cc-exp-month': 'creditCardExpirationMonth',
  'cc-exp-year': 'creditCardExpirationYear',
  'cc-family-name': 'creditCardFamilyName',
  'cc-given-name': 'creditCardGivenName',
  'cc-name': 'creditCardName',
  'cc-number': 'creditCardNumber',
  'cc-type': 'creditCardType',
  country: 'countryName',
  'country-name': 'countryName',
  'current-password': 'password',
  email: 'emailAddress',
  'family-name': 'familyName',
  'given-name': 'givenName',
  honorific: 'namePrefix',
  'honorific-prefix': 'namePrefix',
  'honorific-suffix': 'nameSuffix',
  name: 'name',
  'new-password': 'newPassword',
  nickname: 'nickname',
  off: null,
  'one-time-code': 'oneTimeCode',
  organization: 'organizationName',
  'organization-title': 'jobTitle',
  password: 'password',
  'postal-code': 'postalCode',
  tel: 'telephoneNumber',
  'tel-area-code': 'telephoneNumber',
  'tel-country-code': 'telephoneNumber',
  'tel-extension': 'telephoneNumber',
  'tel-local': 'telephoneNumber',
  'tel-local-prefix': 'telephoneNumber',
  'tel-local-suffix': 'telephoneNumber',
  'tel-national': 'telephoneNumber',
  url: 'URL',
  username: 'username',
}

export function autoCompleteToTextContentType(
  autoComplete: string | undefined
): SDKTextContentType | null | undefined {
  if (!autoComplete) return undefined
  return autoCompleteMap[autoComplete]
}

// swiftStyle keyboardType names, spelled as SwiftUI's UIKeyboardType cases.
export function iosKeyboardType(value: KeyboardTypeOptions): SDKKeyboardType {
  switch (value) {
    case 'ascii-capable':
      return 'asciiCapable'
    case 'numbers-and-punctuation':
      return 'numbersAndPunctuation'
    case 'url':
      return 'URL'
    case 'number-pad':
      return 'numberPad'
    case 'phone-pad':
      return 'phonePad'
    case 'name-phone-pad':
      return 'namePhonePad'
    case 'email-address':
      return 'emailAddress'
    case 'decimal-pad':
      return 'decimalPad'
    case 'twitter':
      return 'twitter'
    case 'web-search':
      return 'webSearch'
    case 'numeric':
      return 'decimalPad'
    default:
      return 'default'
  }
}

// swiftStyle submitLabel names, spelled as SwiftUI's SubmitLabel cases.
export function iosSubmitLabel(value: ReturnKeyTypeOptions): SDKSubmitLabel {
  if (value === 'google' || value === 'yahoo') return 'search'
  if (
    value === 'default' ||
    value === 'none' ||
    value === 'previous' ||
    value === 'emergency-call'
  ) {
    return 'return'
  }
  return value as SDKSubmitLabel
}

// keyboard type names carried by the Compose textfield node.
export type AndroidKeyboardType =
  | 'default'
  | 'number'
  | 'decimal'
  | 'email'
  | 'password'
  | 'phone'
  | 'url'

export function androidKeyboardType(
  value: KeyboardTypeOptions
): AndroidKeyboardType {
  switch (value) {
    case 'email-address':
      return 'email'
    case 'numeric':
    case 'decimal-pad':
      return 'decimal'
    case 'number-pad':
      return 'number'
    case 'phone-pad':
      return 'phone'
    case 'url':
      return 'url'
    default:
      return 'default'
  }
}

// IME action names carried by the Compose textfield node.
export type AndroidImeAction =
  | 'default'
  | 'none'
  | 'go'
  | 'search'
  | 'send'
  | 'previous'
  | 'next'
  | 'done'

export function androidImeAction(value: ReturnKeyTypeOptions): AndroidImeAction {
  if (value === 'google' || value === 'yahoo') return 'search'
  if (value === 'join' || value === 'route' || value === 'emergency-call')
    return 'default'
  return value as AndroidImeAction
}

// maxLength enforcement shared by platforms without a native clamp. a
// non-positive or missing limit means unlimited.
export function applyMaxLength(text: string, maxLength?: number): string {
  if (maxLength == null || maxLength <= 0) return text
  return text.length > maxLength ? text.slice(0, maxLength) : text
}

// focus state for the native fields. the controlled protocol never echoes a
// requested value back as an event, so a focus or blur this side asks for
// (ref.focus(), ref.blur(), autoFocus) reports its own transition here, and
// native events report only the changes the user makes. each transition
// reaches onFocus or onBlur exactly once.
export function useTextInputFocus({
  autoFocus,
  editable,
  onFocus,
  onBlur,
}: {
  autoFocus: boolean | undefined
  editable: boolean
  onFocus: (() => void) | undefined
  onBlur: (() => void) | undefined
}) {
  const [focused, setFocused] = useState(autoFocus ?? false)
  const [focusRevision, setFocusRevision] = useState(0)
  const isFocusedRef = useRef(false)
  const latest = useRef({ editable, onFocus, onBlur })
  latest.current = { editable, onFocus, onBlur }

  const report = (next: boolean) => {
    if (isFocusedRef.current === next) return
    isFocusedRef.current = next
    if (next) latest.current.onFocus?.()
    else latest.current.onBlur?.()
  }
  const request = (next: boolean) => {
    // a disabled field cannot take focus, so asking for it changes nothing.
    if (next && !latest.current.editable) return
    setFocused(next)
    setFocusRevision((revision) => revision + 1)
    report(next)
  }

  useEffect(() => {
    if (autoFocus && latest.current.editable) report(true)
  }, [])

  return {
    focused,
    focusRevision,
    focus: () => request(true),
    blur: () => request(false),
    isFocused: () => isFocusedRef.current,
    handleFocusChange: (next: boolean) => {
      setFocused(next)
      report(next)
    },
  }
}
