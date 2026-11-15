import { describe, expect, test } from 'vitest'
import {
  hasBlank,
  mapPermissionStatus,
  validPostalAddresses,
  validSearch,
} from './map'

describe('contacts mappings', () => {
  test('blank phone or email entries are rejected', () => {
    expect(hasBlank([])).toBe(false)
    expect(hasBlank(['+1 415 555 0109'])).toBe(false)
    expect(hasBlank([''])).toBe(true)
    expect(hasBlank([' '])).toBe(true)
    expect(hasBlank(['a', '  '])).toBe(true)
  })

  test('search needs a name and an integer limit from 1 to 100', () => {
    expect(validSearch('OneProof', 20)).toBe(true)
    expect(validSearch('OneProof', 1)).toBe(true)
    expect(validSearch('OneProof', 100)).toBe(true)
    expect(validSearch('', 20)).toBe(false)
    expect(validSearch('   ', 20)).toBe(false)
    expect(validSearch('OneProof', 0)).toBe(false)
    expect(validSearch('OneProof', 101)).toBe(false)
    expect(validSearch('OneProof', 1.5)).toBe(false)
    expect(validSearch('OneProof', Number.NaN)).toBe(false)
    expect(validSearch('OneProof', Number.POSITIVE_INFINITY)).toBe(false)
  })

  test('postal addresses need a field and reject blank labels', () => {
    expect(validPostalAddresses([])).toBe(true)
    expect(validPostalAddresses([{ street: '1 Market Street' }])).toBe(true)
    expect(validPostalAddresses([{ label: 'Proof office', city: 'SF' }])).toBe(true)
    expect(validPostalAddresses([{}])).toBe(false)
    expect(validPostalAddresses([{ label: '  ', street: '1 Market' }])).toBe(false)
    expect(
      validPostalAddresses([{ street: '1 Market' }, { city: '   ' }])
    ).toBe(false)
  })

  test('permission statuses map through, unknown stays restricted', () => {
    expect(mapPermissionStatus('notDetermined')).toBe('notDetermined')
    expect(mapPermissionStatus('restricted')).toBe('restricted')
    expect(mapPermissionStatus('denied')).toBe('denied')
    expect(mapPermissionStatus('authorized')).toBe('authorized')
    expect(mapPermissionStatus('limited')).toBe('limited')
    expect(mapPermissionStatus('something-new')).toBe('restricted')
  })
})
