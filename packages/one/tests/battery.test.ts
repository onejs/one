import { afterEach, describe, expect, it, vi } from 'vitest'
import { Battery } from '../src/platform/battery/index'
import type { BatteryPowerState, BatteryState } from '../src/platform/battery/types'

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
  return import('../src/platform/battery/index.native')
}

function stubBatteryManager(overrides: Record<string, unknown> = {}) {
  const listeners = new Map<string, Set<() => void>>()
  const manager = {
    level: 0.75,
    charging: true,
    addEventListener: (type: string, listener: () => void) => {
      const set = listeners.get(type) ?? new Set<() => void>()
      set.add(listener)
      listeners.set(type, set)
    },
    removeEventListener: (type: string, listener: () => void) => {
      listeners.get(type)?.delete(listener)
    },
    ...overrides,
  }
  vi.stubGlobal('navigator', { getBattery: async () => manager })
  vi.stubGlobal('window', {})
  return {
    manager,
    fire(type: string) {
      listeners.get(type)?.forEach((listener) => listener())
    },
    count(type: string) {
      return listeners.get(type)?.size ?? 0
    },
  }
}

describe('battery web', () => {
  it('reads live level, state and power state from the battery api', async () => {
    stubBatteryManager()
    expect(await Battery.getLevel()).toBe(0.75)
    expect(await Battery.getState()).toBe('charging')
    expect(await Battery.getPowerState()).toEqual({
      batteryLevel: 0.75,
      batteryState: 'charging',
      lowPowerMode: false,
    })
    expect(await Battery.isLowPowerModeEnabled()).toBe(false)
    expect(Battery.isAvailable()).toBe(true)
  })

  it('maps a discharging battery to unplugged', async () => {
    stubBatteryManager({ charging: false })
    expect(await Battery.getState()).toBe('unplugged')
  })

  it('resolves expo web values without a battery api', async () => {
    vi.stubGlobal('navigator', {})
    expect(await Battery.getLevel()).toBe(1)
    expect(await Battery.getState()).toBe('unknown')
    expect(await Battery.getPowerState()).toEqual({
      batteryLevel: 1,
      batteryState: 'unknown',
      lowPowerMode: false,
    })
    expect(Battery.isAvailable()).toBe(false)
  })

  it('resolves expo web values on the server', async () => {
    vi.stubGlobal('navigator', undefined)
    expect(await Battery.getLevel()).toBe(1)
    expect(await Battery.getState()).toBe('unknown')
    expect(Battery.isAvailable()).toBe(false)
  })

  it('notifies level and state listeners from battery events', async () => {
    const battery = stubBatteryManager()
    const levels: number[] = []
    const states: BatteryState[] = []
    const levelSub = Battery.addLevelListener((event) => {
      levels.push(event.batteryLevel)
    })
    const stateSub = Battery.addStateListener((event) => {
      states.push(event.batteryState)
    })
    await vi.waitFor(() => expect(battery.count('levelchange')).toBe(1))
    await vi.waitFor(() => expect(battery.count('chargingchange')).toBe(1))
    battery.manager.level = 0.5
    battery.fire('levelchange')
    battery.manager.charging = false
    battery.fire('chargingchange')
    await vi.waitFor(() => expect(levels).toEqual([0.5]))
    expect(states).toEqual(['unplugged'])
    levelSub.remove()
    stateSub.remove()
    await vi.waitFor(() => expect(battery.count('levelchange')).toBe(0))
    await vi.waitFor(() => expect(battery.count('chargingchange')).toBe(0))
  })

  it('never fires low power mode on web', async () => {
    stubBatteryManager()
    Battery.addLowPowerModeListener(() => {
      throw new Error('must not fire')
    }).remove()
  })

  it('returns a removable no-op subscription on the server', () => {
    vi.stubGlobal('navigator', undefined)
    Battery.addLevelListener(() => {
      throw new Error('must not fire')
    }).remove()
    Battery.addStateListener(() => {
      throw new Error('must not fire')
    }).remove()
  })

  it('throws synchronously for a non-function listener', () => {
    for (const [add, name] of [
      [Battery.addLevelListener, 'Battery.addLevelListener'],
      [Battery.addStateListener, 'Battery.addStateListener'],
      [Battery.addLowPowerModeListener, 'Battery.addLowPowerModeListener'],
    ] as const) {
      expect(() => add('nope' as never)).toThrow(`${name}: listener must be a function`)
    }
  })

  it('exposes the namespace object', () => {
    expect(Object.keys(Battery).sort()).toEqual([
      'addLevelListener',
      'addLowPowerModeListener',
      'addStateListener',
      'getLevel',
      'getPowerState',
      'getState',
      'isAvailable',
      'isLowPowerModeEnabled',
    ])
    expect(Object.isFrozen(Battery)).toBe(true)
  })
})

describe('battery native entry', () => {
  const power: BatteryPowerState = {
    batteryLevel: 0.75,
    batteryState: 'charging',
    lowPowerMode: false,
  }

  function stubHybrid(overrides: Record<string, unknown> = {}) {
    return {
      getLevel: async () => 0.75,
      getState: async () => 'charging',
      getPowerState: async () => ({ ...power }),
      isLowPowerModeEnabled: async () => false,
      isAvailable: () => true,
      addLevelListener: () => () => {},
      addStateListener: () => () => {},
      addLowPowerModeListener: () => () => {},
      ...overrides,
    }
  }

  it('reads through the hybrid object', async () => {
    const { Battery: NativeBattery } = await loadNativeEntry(stubHybrid())
    expect(await NativeBattery.getLevel()).toBe(0.75)
    expect(await NativeBattery.getState()).toBe('charging')
    expect(await NativeBattery.getPowerState()).toEqual(power)
    expect(await NativeBattery.isLowPowerModeEnabled()).toBe(false)
    expect(NativeBattery.isAvailable()).toBe(true)
  })

  it('restores the stable code from a coded rejection', async () => {
    const { Battery: NativeBattery } = await loadNativeEntry(
      stubHybrid({
        getLevel: async () => {
          throw new Error('E_BATTERY_LEVEL: Battery.getLevel: boom\n')
        },
      })
    )
    const failure = await NativeBattery.getLevel().catch((error: unknown) => error)
    expect(failure).toBeInstanceOf(Error)
    expect((failure as Error).message).toBe('Battery.getLevel: boom')
    expect((failure as { code?: string }).code).toBe('E_BATTERY_LEVEL')
  })

  it('wraps remover callbacks in a subscription', async () => {
    const remove = vi.fn()
    const listeners: Record<string, (event: never) => void> = {}
    const { Battery: NativeBattery } = await loadNativeEntry(
      stubHybrid({
        addLevelListener: (listener: (event: never) => void) => {
          listeners.level = listener
          return remove
        },
      })
    )
    const subscription = NativeBattery.addLevelListener(() => {})
    expect(typeof subscription.remove).toBe('function')
    subscription.remove()
    expect(remove).toHaveBeenCalledTimes(1)
  })

  it('validates listeners before touching native', async () => {
    const createHybridObject = vi.fn(() => {
      throw new Error('must not reach native')
    })
    vi.resetModules()
    const { NitroModules } = await import('react-native-nitro-modules')
    vi.mocked(NitroModules.createHybridObject).mockImplementation(
      createHybridObject as never
    )
    const { Battery: NativeBattery } =
      await import('../src/platform/battery/index.native')
    expect(() => NativeBattery.addLevelListener('nope' as never)).toThrow(
      'Battery.addLevelListener: listener must be a function'
    )
    expect(createHybridObject).not.toHaveBeenCalled()
  })
})
