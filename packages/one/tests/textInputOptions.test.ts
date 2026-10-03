import { describe, expect, it } from 'vitest'
import { assertTextInputOptions } from '../src/platform/textTypes'

describe('native text input options', () => {
  it('accepts SwiftUI defaults and named UIKit values', () => {
    expect(() => assertTextInputOptions('TextEditor', '', '')).not.toThrow()
    expect(() => assertTextInputOptions('TextEditor', 'emailAddress', 'oneTimeCode')).not.toThrow()
  })

  it('rejects unsupported values before a Swift converter sees them', () => {
    expect(() => assertTextInputOptions('TextEditor', 'invalid', '')).toThrow('TextEditor keyboardType')
    expect(() => assertTextInputOptions('TextEditor', '', 'invalid')).toThrow('TextEditor textContentType')
  })
})
