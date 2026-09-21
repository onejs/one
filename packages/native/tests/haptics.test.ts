import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }))

vi.mock('react-native', () => ({
  TurboModuleRegistry: { get: getMock },
}))

import {
  Haptics as WebHaptics,
  isHapticsAvailable as isWebHapticsAvailable,
} from '../src/haptics/index'

async function loadNative() {
  // the native entry caches the module lookup at module scope, so each
  // dispatch case re-imports fresh after setting the mock.
  vi.resetModules()
  return await import('../src/haptics/index.native')
}

beforeEach(() => {
  getMock.mockReset()
})

describe('haptics js-boundary validation', () => {
  it('throws on unknown impact styles and notification types', async () => {
    const { Haptics } = await loadNative()
    expect(() => Haptics.impact('invalid' as never)).toThrow(TypeError)
    expect(() => Haptics.notification('bogus' as never)).toThrow(TypeError)
    expect(() => Haptics.impact(undefined as never)).toThrow(TypeError)
    expect(() => WebHaptics.impact('invalid' as never)).toThrow(TypeError)
    expect(() => WebHaptics.notification('bogus' as never)).toThrow(TypeError)
  })

  it('accepts every documented style and type', async () => {
    getMock.mockReturnValue(null)
    const { Haptics } = await loadNative()
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
  it('dispatches to the native module when present', async () => {
    const native = { selection: vi.fn(), impact: vi.fn(), notification: vi.fn() }
    getMock.mockReturnValue(native)
    const { Haptics, isHapticsAvailable } = await loadNative()
    expect(isHapticsAvailable()).toBe(true)
    Haptics.selection()
    Haptics.impact('rigid')
    Haptics.notification('error')
    expect(native.selection).toHaveBeenCalledTimes(1)
    expect(native.impact).toHaveBeenCalledWith('rigid')
    expect(native.notification).toHaveBeenCalledWith('error')
  })

  it('resolves the native module once', async () => {
    const native = { selection: vi.fn(), impact: vi.fn(), notification: vi.fn() }
    getMock.mockReturnValue(native)
    const { Haptics, isHapticsAvailable } = await loadNative()
    expect(isHapticsAvailable()).toBe(true)
    Haptics.selection()
    Haptics.impact('light')
    Haptics.notification('success')
    expect(getMock).toHaveBeenCalledTimes(1)
    expect(getMock).toHaveBeenCalledWith('OneNativeHaptics')
  })

  it('no-ops when the native module is missing', async () => {
    getMock.mockReturnValue(null)
    const { Haptics, isHapticsAvailable } = await loadNative()
    expect(isHapticsAvailable()).toBe(false)
    expect(() => Haptics.selection()).not.toThrow()
    expect(() => Haptics.impact('light')).not.toThrow()
    expect(() => Haptics.notification('success')).not.toThrow()
  })

  it('never dispatches invalid strings: validation throws first', async () => {
    const native = { selection: vi.fn(), impact: vi.fn(), notification: vi.fn() }
    getMock.mockReturnValue(native)
    const { Haptics } = await loadNative()
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
