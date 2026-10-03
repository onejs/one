import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }))

vi.mock('react-native-nitro-modules', () => ({
  NitroModules: { createHybridObject: getMock },
}))

import { Haptics as WebHaptics } from '../src/platform/haptics/index'

async function loadNative() {
  // the native entry caches the hybrid object at module scope, so each
  // dispatch case re-imports fresh after setting the mock.
  vi.resetModules()
  return await import('../src/platform/haptics/index.native')
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
    getMock.mockReturnValue({ selection: vi.fn(), impact: vi.fn(), notification: vi.fn() })
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
  it('dispatches to the hybrid object', async () => {
    const native = { selection: vi.fn(), impact: vi.fn(), notification: vi.fn() }
    getMock.mockReturnValue(native)
    const { Haptics } = await loadNative()
    Haptics.selection()
    Haptics.impact('rigid')
    Haptics.notification('error')
    expect(native.selection).toHaveBeenCalledTimes(1)
    expect(native.impact).toHaveBeenCalledWith('rigid')
    expect(native.notification).toHaveBeenCalledWith('error')
  })

  it('creates the hybrid object once', async () => {
    const native = { selection: vi.fn(), impact: vi.fn(), notification: vi.fn() }
    getMock.mockReturnValue(native)
    const { Haptics } = await loadNative()
    Haptics.selection()
    Haptics.impact('light')
    Haptics.notification('success')
    expect(getMock).toHaveBeenCalledTimes(1)
    expect(getMock).toHaveBeenCalledWith('OneHaptics')
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
    expect(() => WebHaptics.selection()).not.toThrow()
    expect(() => WebHaptics.impact('soft')).not.toThrow()
    expect(() => WebHaptics.notification('warning')).not.toThrow()
  })
})
