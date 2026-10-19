import { describe, expect, test } from 'vitest'
import {
  isSimulatorEnvironment,
  measurementSystemName,
  normalizeVendorId,
  textDirectionName,
  unicodeCalendar,
} from './map'

describe('device mappings', () => {
  test('unicode calendar renames the expo special cases', () => {
    expect(unicodeCalendar('gregorian')).toBe('gregory')
    expect(unicodeCalendar('ethiopicAmeteMihret')).toBe('ethiopic')
    expect(unicodeCalendar('ethiopicAmeteAlem')).toBe('ethioaa')
    expect(unicodeCalendar('islamicCivil')).toBe('islamic-civil')
    expect(unicodeCalendar('islamicTabular')).toBe('islamic-tbla')
    expect(unicodeCalendar('islamicUmmAlQura')).toBe('islamic-umalqura')
    expect(unicodeCalendar('republicOfChina')).toBe('roc')
  })

  test('unicode calendar passes other identifiers through', () => {
    expect(unicodeCalendar('hebrew')).toBe('hebrew')
    expect(unicodeCalendar('islamic')).toBe('islamic')
    expect(unicodeCalendar('buddhist')).toBe('buddhist')
  })

  test('measurement system maps foundation identifiers', () => {
    expect(measurementSystemName('metric')).toBe('metric')
    expect(measurementSystemName('ussystem')).toBe('us')
    expect(measurementSystemName('uksystem')).toBe('uk')
  })

  test('measurement system falls back to metric when unknown', () => {
    expect(measurementSystemName('')).toBe('metric')
    expect(measurementSystemName('us')).toBe('metric')
  })

  test('simulator detection reads the xcode environment stamp', () => {
    expect(isSimulatorEnvironment({})).toBe(false)
    expect(isSimulatorEnvironment({ SIMULATOR_DEVICE_NAME: 'iPhone' })).toBe(false)
    expect(
      isSimulatorEnvironment({ SIMULATOR_MODEL_IDENTIFIER: 'iPhone17,1' })
    ).toBe(true)
  })

  test('text direction matches only right-to-left', () => {
    expect(textDirectionName('rightToLeft')).toBe('rtl')
    expect(textDirectionName('leftToRight')).toBe('ltr')
    expect(textDirectionName('unknown')).toBe('ltr')
    expect(textDirectionName('topToBottom')).toBe('ltr')
  })

  test('vendor id normalizes to the uppercase uuidString form', () => {
    expect(normalizeVendorId(null)).toBeUndefined()
    expect(normalizeVendorId(undefined)).toBeUndefined()
    expect(normalizeVendorId('')).toBe('')
    expect(normalizeVendorId('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe(
      'A1B2C3D4-E5F6-7890-ABCD-EF1234567890'
    )
  })
})
