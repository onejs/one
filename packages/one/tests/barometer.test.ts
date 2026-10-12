import { describe, expect, it, vi } from 'vitest'
import { Barometer } from '../src/platform/barometer/index'

vi.mock('react-native-nitro-modules', () => ({
  NitroModules: { createHybridObject: vi.fn() },
}))

async function loadNativeEntry(hybrid: unknown) {
  vi.resetModules()
  const { NitroModules } = await import('react-native-nitro-modules')
  vi.mocked(NitroModules.createHybridObject).mockReturnValue(hybrid as never)
  return import('../src/platform/barometer/index.native')
}

describe('barometer web', () => {
  it('reads unavailable and never fires', () => {
    expect(Barometer.isAvailable()).toBe(false)
    Barometer.setUpdateInterval(100)
    Barometer.addListener(() => {
      throw new Error('must not fire')
    }).remove()
  })

  it('throws synchronously for invalid arguments', () => {
    expect(() => Barometer.addListener('nope' as never)).toThrow(
      'Barometer.addListener: listener must be a function'
    )
    for (const interval of [-1, Number.NaN, Number.POSITIVE_INFINITY, '100' as never]) {
      expect(() => Barometer.setUpdateInterval(interval)).toThrow(
        'Barometer.setUpdateInterval: interval must be a finite number at least 0'
      )
    }
  })

  it('exposes the namespace object', () => {
    expect(Object.keys(Barometer).sort()).toEqual([
      'addListener',
      'isAvailable',
      'setUpdateInterval',
    ])
    expect(Object.isFrozen(Barometer)).toBe(true)
  })
})

describe('barometer native entry', () => {
  function stubHybrid(overrides: Record<string, unknown> = {}) {
    return {
      isAvailable: () => true,
      setUpdateInterval: () => {},
      addListener: () => () => {},
      ...overrides,
    }
  }

  it('reads through the hybrid object', async () => {
    const setUpdateInterval = vi.fn()
    const { Barometer: NativeBarometer } = await loadNativeEntry(
      stubHybrid({ setUpdateInterval })
    )
    expect(NativeBarometer.isAvailable()).toBe(true)
    NativeBarometer.setUpdateInterval(100)
    expect(setUpdateInterval).toHaveBeenCalledWith(100)
  })

  it('forwards expo-shaped events and wraps the remover', async () => {
    const seen: { pressure: number; timestamp: number }[] = []
    const remove = vi.fn()
    const { Barometer: NativeBarometer } = await loadNativeEntry(
      stubHybrid({
        addListener: (listener: (event: never) => void) => {
          listener({ pressure: 1013.25, timestamp: 1.5 } as never)
          return remove
        },
      })
    )
    const subscription = NativeBarometer.addListener((event) => {
      seen.push(event)
    })
    expect(seen).toEqual([{ pressure: 1013.25, timestamp: 1.5 }])
    expect(typeof subscription.remove).toBe('function')
    subscription.remove()
    expect(remove).toHaveBeenCalledTimes(1)
  })

  it('validates arguments before touching native', async () => {
    const createHybridObject = vi.fn(() => {
      throw new Error('must not reach native')
    })
    vi.resetModules()
    const { NitroModules } = await import('react-native-nitro-modules')
    vi.mocked(NitroModules.createHybridObject).mockImplementation(
      createHybridObject as never
    )
    const { Barometer: NativeBarometer } =
      await import('../src/platform/barometer/index.native')
    expect(() => NativeBarometer.addListener('nope' as never)).toThrow(
      'Barometer.addListener: listener must be a function'
    )
    expect(() => NativeBarometer.setUpdateInterval(-1)).toThrow(
      'Barometer.setUpdateInterval: interval must be a finite number at least 0'
    )
    expect(createHybridObject).not.toHaveBeenCalled()
  })
})
