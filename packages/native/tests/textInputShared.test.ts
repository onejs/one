import { describe, expect, it } from 'vitest'

import {
  androidImeAction,
  androidKeyboardType,
  applyMaxLength,
  autoCompleteToTextContentType,
  enterKeyHintToReturnKeyType,
  inputModeToKeyboardType,
  iosKeyboardType,
  iosSubmitLabel,
  resolveEditable,
} from '../src/universal/TextInput/textInputShared'

describe('resolveEditable', () => {
  it('treats readOnly as not editable', () => {
    expect(resolveEditable(undefined, true)).toBe(false)
    expect(resolveEditable(true, true)).toBe(false)
  })

  it('defaults to editable', () => {
    expect(resolveEditable(undefined, undefined)).toBe(true)
    expect(resolveEditable(false, undefined)).toBe(false)
    expect(resolveEditable(true, false)).toBe(true)
  })
})

describe('inputModeToKeyboardType', () => {
  it('maps every inputMode', () => {
    expect(inputModeToKeyboardType('decimal')).toBe('decimal-pad')
    expect(inputModeToKeyboardType('email')).toBe('email-address')
    expect(inputModeToKeyboardType('none')).toBe('default')
    expect(inputModeToKeyboardType('numeric')).toBe('numeric')
    expect(inputModeToKeyboardType('search')).toBe('web-search')
    expect(inputModeToKeyboardType('tel')).toBe('phone-pad')
    expect(inputModeToKeyboardType('text')).toBe('default')
    expect(inputModeToKeyboardType('url')).toBe('url')
    expect(inputModeToKeyboardType(undefined)).toBeUndefined()
  })
})

describe('enterKeyHintToReturnKeyType', () => {
  it('maps every enterKeyHint', () => {
    expect(enterKeyHintToReturnKeyType('enter')).toBe('default')
    expect(enterKeyHintToReturnKeyType('done')).toBe('done')
    expect(enterKeyHintToReturnKeyType('go')).toBe('go')
    expect(enterKeyHintToReturnKeyType('next')).toBe('next')
    expect(enterKeyHintToReturnKeyType('previous')).toBe('previous')
    expect(enterKeyHintToReturnKeyType('search')).toBe('search')
    expect(enterKeyHintToReturnKeyType('send')).toBe('send')
    expect(enterKeyHintToReturnKeyType(undefined)).toBeUndefined()
  })
})

describe('iosKeyboardType', () => {
  it('maps RN types to the UIKit names the spec carries', () => {
    expect(iosKeyboardType('default')).toBe('default')
    expect(iosKeyboardType('ascii-capable')).toBe('asciiCapable')
    expect(iosKeyboardType('numbers-and-punctuation')).toBe(
      'numbersAndPunctuation'
    )
    expect(iosKeyboardType('url')).toBe('url')
    expect(iosKeyboardType('number-pad')).toBe('numberPad')
    expect(iosKeyboardType('phone-pad')).toBe('phonePad')
    expect(iosKeyboardType('name-phone-pad')).toBe('namePhonePad')
    expect(iosKeyboardType('email-address')).toBe('emailAddress')
    expect(iosKeyboardType('decimal-pad')).toBe('decimalPad')
    expect(iosKeyboardType('twitter')).toBe('twitter')
    expect(iosKeyboardType('web-search')).toBe('webSearch')
    // Expo behavior: numeric has no direct UIKit peer.
    expect(iosKeyboardType('numeric')).toBe('decimalPad')
    expect(iosKeyboardType('visible-password')).toBe('default')
  })
})

describe('iosSubmitLabel', () => {
  it('maps RN return keys to the SubmitLabel names the spec carries', () => {
    expect(iosSubmitLabel('done')).toBe('done')
    expect(iosSubmitLabel('go')).toBe('go')
    expect(iosSubmitLabel('send')).toBe('send')
    expect(iosSubmitLabel('join')).toBe('join')
    expect(iosSubmitLabel('route')).toBe('route')
    expect(iosSubmitLabel('search')).toBe('search')
    expect(iosSubmitLabel('next')).toBe('next')
    expect(iosSubmitLabel('google')).toBe('search')
    expect(iosSubmitLabel('yahoo')).toBe('search')
    expect(iosSubmitLabel('default')).toBe('return')
    expect(iosSubmitLabel('none')).toBe('return')
    expect(iosSubmitLabel('previous')).toBe('return')
    expect(iosSubmitLabel('emergency-call')).toBe('return')
  })
})

describe('androidKeyboardType', () => {
  it('maps RN types to the Compose node names', () => {
    expect(androidKeyboardType('default')).toBe('default')
    expect(androidKeyboardType('email-address')).toBe('email')
    expect(androidKeyboardType('numeric')).toBe('decimal')
    expect(androidKeyboardType('decimal-pad')).toBe('decimal')
    expect(androidKeyboardType('number-pad')).toBe('number')
    expect(androidKeyboardType('phone-pad')).toBe('phone')
    expect(androidKeyboardType('url')).toBe('url')
    expect(androidKeyboardType('ascii-capable')).toBe('default')
    expect(androidKeyboardType('numbers-and-punctuation')).toBe('default')
    expect(androidKeyboardType('name-phone-pad')).toBe('default')
    expect(androidKeyboardType('twitter')).toBe('default')
    expect(androidKeyboardType('web-search')).toBe('default')
    expect(androidKeyboardType('visible-password')).toBe('default')
  })
})

describe('androidImeAction', () => {
  it('maps RN return keys to the Compose IME names', () => {
    expect(androidImeAction('done')).toBe('done')
    expect(androidImeAction('go')).toBe('go')
    expect(androidImeAction('next')).toBe('next')
    expect(androidImeAction('previous')).toBe('previous')
    expect(androidImeAction('search')).toBe('search')
    expect(androidImeAction('send')).toBe('send')
    expect(androidImeAction('none')).toBe('none')
    expect(androidImeAction('google')).toBe('search')
    expect(androidImeAction('yahoo')).toBe('search')
    expect(androidImeAction('join')).toBe('default')
    expect(androidImeAction('route')).toBe('default')
    expect(androidImeAction('emergency-call')).toBe('default')
    expect(androidImeAction('default')).toBe('default')
  })
})

describe('autoCompleteToTextContentType', () => {
  it('maps web tokens to the UIKit content types', () => {
    expect(autoCompleteToTextContentType('email')).toBe('emailAddress')
    expect(autoCompleteToTextContentType('tel')).toBe('telephoneNumber')
    expect(autoCompleteToTextContentType('new-password')).toBe('newPassword')
    expect(autoCompleteToTextContentType('one-time-code')).toBe('oneTimeCode')
    expect(autoCompleteToTextContentType('postal-code')).toBe('postalCode')
    expect(autoCompleteToTextContentType('off')).toBe('none')
    expect(autoCompleteToTextContentType('url')).toBe('URL')
  })

  it('applies nothing for missing or unmapped tokens', () => {
    expect(autoCompleteToTextContentType(undefined)).toBeUndefined()
    expect(autoCompleteToTextContentType('')).toBeUndefined()
    // never passed through: the native converter fails loudly on unknowns.
    expect(autoCompleteToTextContentType('sex')).toBeUndefined()
    expect(autoCompleteToTextContentType('bogus-token')).toBeUndefined()
  })
})

describe('applyMaxLength', () => {
  it('slices over-length text', () => {
    expect(applyMaxLength('hello', 3)).toBe('hel')
    expect(applyMaxLength('hi', 3)).toBe('hi')
    expect(applyMaxLength('hi', 2)).toBe('hi')
  })

  it('treats missing or non-positive limits as unlimited', () => {
    expect(applyMaxLength('hello', undefined)).toBe('hello')
    expect(applyMaxLength('hello', 0)).toBe('hello')
    expect(applyMaxLength('hello', -1)).toBe('hello')
  })
})
