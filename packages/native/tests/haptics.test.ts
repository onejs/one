import { describe, expect, it, vi } from 'vitest'

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }))

vi.mock('react-native', () => ({
  TurboModuleRegistry: { get: getMock },
}))

import {
  errorConstantForSdk,
  Haptics,
  isHapticsAvailable,
  selectionConstantForSdk,
  successConstantForSdk,
} from '../src/haptics/index.native'
import { Haptics as WebHaptics, isHapticsAvailable as isWebHapticsAvailable } from '../src/haptics/index'

describe('haptics android sdkInt gating', () => {
  it('gates SEGMENT_TICK at 34 with CLOCK_TICK below', () => {
    expect(selectionConstantForSdk(29)).toBe('CLOCK_TICK')
    expect(selectionConstantForSdk(30)).toBe('CLOCK_TICK')
    expect(selectionConstantForSdk(33)).toBe('CLOCK_TICK')
    expect(selectionConstantForSdk(34)).toBe('SEGMENT_TICK')
  })

  it('gates CONFIRM at 30 with VIRTUAL_KEY below', () => {
    expect(successConstantForSdk(29)).toBe('VIRTUAL_KEY')
    expect(successConstantForSdk(30)).toBe('CONFIRM')
    expect(successConstantForSdk(33)).toBe('CONFIRM')
    expect(successConstantForSdk(34)).toBe('CONFIRM')
  })

  it('gates REJECT at 30 with CONTEXT_CLICK below, distinct from warning', () => {
    expect(errorConstantForSdk(29)).toBe('CONTEXT_CLICK')
    expect(errorConstantForSdk(30)).toBe('REJECT')
    expect(errorConstantForSdk(33)).toBe('REJECT')
    expect(errorConstantForSdk(34)).toBe('REJECT')
    // warning is LONG_PRESS on every api level, so error must never
    // resolve to LONG_PRESS below 30.
    expect(errorConstantForSdk(29)).not.toBe('LONG_PRESS')
  })
})

describe('haptics js-boundary validation', () => {
  it('throws on unknown impact styles and notification types', () => {
    expect(() => Haptics.impact('invalid' as never)).toThrow(TypeError)
    expect(() => Haptics.notification('bogus' as never)).toThrow(TypeError)
    expect(() => Haptics.impact(undefined as never)).toThrow(TypeError)
    expect(() => WebHaptics.impact('invalid' as never)).toThrow(TypeError)
    expect(() => WebHaptics.notification('bogus' as never)).toThrow(TypeError)
  })

  it('accepts every documented style and type', () => {
    getMock.mockReturnValue(null)
    for (const style of ['light', 'medium', 'heavy', 'soft', 'rigid'] as const) {
      expect(() => Haptics.impact(style)).not.toThrow()
      expect(() => WebHaptics.impact(style)).not.toThrow()
    }
    for (const type of ['success', 'warning', 'error'] as const) {
      expect(() => Haptics.notification(type)).not.toThrow()
      expect(() => WebHaptics.notification(type)).not.toThrow()
    }
    expect(() => Haptics.selection()).not.toThrow()
    expect(() => WebHaptics.selection()).not.toThrow()
  })
})

describe('haptics native dispatch', () => {
  it('dispatches to the native module when present', () => {
    const native = { selection: vi.fn(), impact: vi.fn(), notification: vi.fn() }
    getMock.mockReturnValue(native)
    expect(isHapticsAvailable()).toBe(true)
    Haptics.selection()
    Haptics.impact('rigid')
    Haptics.notification('error')
    expect(native.selection).toHaveBeenCalledTimes(1)
    expect(native.impact).toHaveBeenCalledWith('rigid')
    expect(native.notification).toHaveBeenCalledWith('error')
  })

  it('no-ops when the native module is missing', () => {
    getMock.mockReturnValue(null)
    expect(isHapticsAvailable()).toBe(false)
    expect(() => Haptics.selection()).not.toThrow()
    expect(() => Haptics.impact('light')).not.toThrow()
    expect(() => Haptics.notification('success')).not.toThrow()
  })

  it('no-ops when TurboModuleRegistry itself throws', () => {
    getMock.mockImplementation(() => {
      throw new Error('no bridge')
    })
    expect(isHapticsAvailable()).toBe(false)
    expect(() => Haptics.selection()).not.toThrow()
  })

  it('never dispatches invalid strings: validation throws first', () => {
    const native = { selection: vi.fn(), impact: vi.fn(), notification: vi.fn() }
    getMock.mockReturnValue(native)
    expect(() => Haptics.impact('invalid' as never)).toThrow(TypeError)
    expect(() => Haptics.notification('bogus' as never)).toThrow(TypeError)
    expect(native.impact).not.toHaveBeenCalled()
    expect(native.notification).not.toHaveBeenCalled()
  })

  it('the web entry is a no-op that still validates', () => {
    expect(isWebHapticsAvailable()).toBe(false)
    expect(() => WebHaptics.selection()).not.toThrow()
    expect(() => WebHaptics.impact('soft')).not.toThrow()
    expect(() => WebHaptics.notification('warning')).not.toThrow()
  })
})
