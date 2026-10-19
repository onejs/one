import { describe, expect, test } from 'vitest'
import { mapBatteryState } from './map'

describe('battery mappings', () => {
  test('uidDevice states pass through', () => {
    expect(mapBatteryState('unplugged')).toBe('unplugged')
    expect(mapBatteryState('charging')).toBe('charging')
    expect(mapBatteryState('full')).toBe('full')
    expect(mapBatteryState('unknown')).toBe('unknown')
  })

  test('future states fall back to unknown', () => {
    expect(mapBatteryState('')).toBe('unknown')
    expect(mapBatteryState('notCharging')).toBe('unknown')
    expect(mapBatteryState('warming')).toBe('unknown')
  })
})
