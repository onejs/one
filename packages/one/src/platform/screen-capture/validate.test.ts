import { describe, expect, test } from 'vitest'
import { assertPreventKey, preventDefaultKey, validateViewTag } from './validate'

describe('screen capture validation', () => {
  test('captureView tags must be positive 32-bit integers', () => {
    expect(() => validateViewTag(1)).not.toThrow()
    expect(() => validateViewTag(0)).toThrow(
      'ScreenCapture.captureView requires a positive 32-bit integer view tag'
    )
  })

  test('prevent and allow accept the default and custom keys', () => {
    expect(preventDefaultKey).toBe('default')
    expect(() => assertPreventKey(undefined, 'prevent')).toThrow(
      'ScreenCapture.prevent requires a non-empty string key'
    )
    expect(() => assertPreventKey('default', 'prevent')).not.toThrow()
    expect(() => assertPreventKey('receipt', 'allow')).not.toThrow()
  })

  test('prevent and allow reject empty and non-string keys', () => {
    expect(() => assertPreventKey('', 'prevent')).toThrow(
      'ScreenCapture.prevent requires a non-empty string key'
    )
    expect(() => assertPreventKey(0, 'allow')).toThrow(
      'ScreenCapture.allow requires a non-empty string key'
    )
    expect(() => assertPreventKey(null, 'allow')).toThrow(
      'ScreenCapture.allow requires a non-empty string key'
    )
  })
})
