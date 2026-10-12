import { afterEach, describe, expect, it, vi } from 'vitest'
import { LightSensor } from '../src/platform/light-sensor/index'

vi.mock('react-native-nitro-modules', () => ({
  NitroModules: { createHybridObject: vi.fn() },
}))

afterEach(() => {
  vi.unstubAllGlobals()
})

async function loadNativeEntry(hybrid: unknown) {
  vi.resetModules()
  const { NitroModules } = await import('react-native-nitro-modules')
  vi.mocked(NitroModules.createHybridObject).mockReturnValue(hybrid as never)
  return import('../src/platform/light-sensor/index.native')
}

function stubAmbientLightSensor(illuminance = 250) {
  const listeners = new Map<string, Set<() => void>>()
  const sensor = {
    illuminance,
    start: vi.fn(),
    stop: vi.fn(),
    addEventListener: (type: string, listener: () => void) => {
      const set = listeners.get(type) ?? new Set<() => void>()
      set.add(listener)
      listeners.set(type, set)
    },
    removeEventListener: (type: string, listener: () => void) => {
      listeners.get(type)?.delete(listener)
    },
  }
  vi.stubGlobal('window', {
    AmbientLightSensor: vi.fn(function () {
      return sensor
    }),
  })
  return {
    sensor,
    fire() {
      listeners.get('reading')?.forEach((listener) => listener())
    },
    count() {
      return listeners.get('reading')?.size ?? 0
    },
  }
}

describe('light sensor web', () => {
  it('reads live lux from the ambient light sensor', async () => {
    const ambient = stubAmbientLightSensor()
    expect(LightSensor.isAvailable()).toBe(true)
    const seen: number[] = []
    const subscription = LightSensor.addListener((event) => {
      seen.push(event.illuminance)
      expect(event.timestamp).toBeGreaterThan(0)
    })
    expect(ambient.count()).toBe(1)
    ambient.sensor.illuminance = 400
    ambient.fire()
    expect(seen).toEqual([400])
    subscription.remove()
    expect(ambient.count()).toBe(0)
    expect(ambient.sensor.stop).toHaveBeenCalled()
  })

  it('reads unavailable without the sensor api', () => {
    vi.stubGlobal('window', {})
    expect(LightSensor.isAvailable()).toBe(false)
    LightSensor.setUpdateInterval(100)
    LightSensor.addListener(() => {
      throw new Error('must not fire')
    }).remove()
  })

  it('reads unavailable on the server', () => {
    vi.stubGlobal('window', undefined)
    expect(LightSensor.isAvailable()).toBe(false)
    LightSensor.addListener(() => {
      throw new Error('must not fire')
    }).remove()
  })

  it('throws synchronously for invalid arguments', () => {
    expect(() => LightSensor.addListener('nope' as never)).toThrow(
      'LightSensor.addListener: listener must be a function'
    )
    for (const interval of [-1, Number.NaN, Number.POSITIVE_INFINITY, '100' as never]) {
      expect(() => LightSensor.setUpdateInterval(interval)).toThrow(
        'LightSensor.setUpdateInterval: interval must be a finite number at least 0'
      )
    }
  })

  it('exposes the namespace object', () => {
    expect(Object.keys(LightSensor).sort()).toEqual([
      'addListener',
      'isAvailable',
      'setUpdateInterval',
    ])
    expect(Object.isFrozen(LightSensor)).toBe(true)
  })
})

describe('light sensor native entry', () => {
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
    const { LightSensor: NativeLightSensor } = await loadNativeEntry(
      stubHybrid({ setUpdateInterval })
    )
    expect(NativeLightSensor.isAvailable()).toBe(true)
    NativeLightSensor.setUpdateInterval(100)
    expect(setUpdateInterval).toHaveBeenCalledWith(100)
  })

  it('forwards expo-shaped events and wraps the remover', async () => {
    const seen: { illuminance: number; timestamp: number }[] = []
    const remove = vi.fn()
    const { LightSensor: NativeLightSensor } = await loadNativeEntry(
      stubHybrid({
        addListener: (listener: (event: never) => void) => {
          listener({ illuminance: 250, timestamp: 1.5 } as never)
          return remove
        },
      })
    )
    const subscription = NativeLightSensor.addListener((event) => {
      seen.push(event)
    })
    expect(seen).toEqual([{ illuminance: 250, timestamp: 1.5 }])
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
    const { LightSensor: NativeLightSensor } =
      await import('../src/platform/light-sensor/index.native')
    expect(() => NativeLightSensor.addListener('nope' as never)).toThrow(
      'LightSensor.addListener: listener must be a function'
    )
    expect(() => NativeLightSensor.setUpdateInterval(-1)).toThrow(
      'LightSensor.setUpdateInterval: interval must be a finite number at least 0'
    )
    expect(createHybridObject).not.toHaveBeenCalled()
  })
})
