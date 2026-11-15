import { describe, expect, test } from 'vitest'
import { classifyScheme, fontExtension, isBenignRegisterError } from './map'

describe('fonts mappings', () => {
  test('schemes classify case-insensitively', () => {
    expect(classifyScheme('file')).toBe('file')
    expect(classifyScheme('FILE')).toBe('file')
    expect(classifyScheme('http')).toBe('remote')
    expect(classifyScheme('https')).toBe('remote')
    expect(classifyScheme('HTTPS')).toBe('remote')
  })

  test('unknown and missing schemes are unsupported', () => {
    expect(classifyScheme('ftp')).toBe('unsupported')
    expect(classifyScheme('')).toBe('unsupported')
    expect(classifyScheme(null)).toBe('unsupported')
    expect(classifyScheme(undefined)).toBe('unsupported')
  })

  test('cache keeps the url extension and defaults to ttf', () => {
    expect(fontExtension('otf')).toBe('otf')
    expect(fontExtension('ttf')).toBe('ttf')
    expect(fontExtension('')).toBe('ttf')
    expect(fontExtension(null)).toBe('ttf')
    expect(fontExtension(undefined)).toBe('ttf')
  })

  test('only duplicate registrations are benign', () => {
    expect(isBenignRegisterError('alreadyRegistered')).toBe(true)
    expect(isBenignRegisterError('duplicatedName')).toBe(true)
    expect(isBenignRegisterError('invalidFontData')).toBe(false)
    expect(isBenignRegisterError('registrationFailed')).toBe(false)
    expect(isBenignRegisterError(null)).toBe(false)
    expect(isBenignRegisterError(undefined)).toBe(false)
  })
})
