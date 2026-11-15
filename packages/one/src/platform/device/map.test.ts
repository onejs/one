import { describe, expect, test } from 'vitest'
import {
  describingCalendar,
  isSimulatorEnvironment,
  measurementSystemName,
  normalizeVendorId,
  textDirectionName,
  unicodeCalendar,
} from './map'

describe('device mappings', () => {
  test('describing calendar matches String(describing:) for every case', () => {
    expect(describingCalendar('gregorian')).toBe('gregorian')
    expect(describingCalendar('ethiopicAmeteMihret')).toBe('ethiopic')
    expect(describingCalendar('ethiopicAmeteAlem')).toBe('ethioaa')
    expect(describingCalendar('islamicCivil')).toBe('islamic-civil')
    expect(describingCalendar('islamicTabular')).toBe('islamic-tbla')
    expect(describingCalendar('islamicUmmAlQura')).toBe('islamic-umalqura')
    expect(describingCalendar('republicOfChina')).toBe('roc')
    for (const identifier of [
      'buddhist',
      'chinese',
      'coptic',
      'hebrew',
      'iso8601',
      'indian',
      'islamic',
      'japanese',
      'persian',
      'bangla',
      'gujarati',
      'kannada',
      'malayalam',
      'marathi',
      'odia',
      'tamil',
      'telugu',
      'vikram',
      'dangi',
      'vietnamese',
    ]) {
      expect(describingCalendar(identifier)).toBe(identifier)
    }
  })

  test('unicode calendar is the describing form except gregorian', () => {
    expect(unicodeCalendar('gregorian')).toBe('gregory')
    expect(unicodeCalendar('ethiopicAmeteMihret')).toBe('ethiopic')
    expect(unicodeCalendar('ethiopicAmeteAlem')).toBe('ethioaa')
    expect(unicodeCalendar('islamicCivil')).toBe('islamic-civil')
    expect(unicodeCalendar('islamicTabular')).toBe('islamic-tbla')
    expect(unicodeCalendar('islamicUmmAlQura')).toBe('islamic-umalqura')
    expect(unicodeCalendar('republicOfChina')).toBe('roc')
    expect(unicodeCalendar('hebrew')).toBe('hebrew')
    expect(unicodeCalendar('islamic')).toBe('islamic')
    expect(unicodeCalendar('buddhist')).toBe('buddhist')
    expect(unicodeCalendar('dangi')).toBe('dangi')
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
