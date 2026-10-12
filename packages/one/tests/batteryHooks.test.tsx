import { act, create } from 'react-test-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

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

function last<T>(values: T[]): T {
  return values[values.length - 1]
}

function makeWebManager(level: number) {
  const listeners = new Map<string, Set<() => void>>()
  return {
    level,
    charging: true,
    addEventListener: (type: string, listener: () => void) => {
      const set = listeners.get(type) ?? new Set<() => void>()
      set.add(listener)
      listeners.set(type, set)
    },
    removeEventListener: (type: string, listener: () => void) => {
      listeners.get(type)?.delete(listener)
    },
    fire(type: string) {
      listeners.get(type)?.forEach((listener) => listener())
    },
  }
}

describe('battery hooks stale initial snapshot', () => {
  it('useBatteryLevel keeps the live event over a late stale snapshot', async () => {
    let resolveSnapshot!: (level: number) => void
    let levelListener!: (event: { batteryLevel: number }) => void
    const { useBatteryLevel } = await loadNativeEntry({
      getLevel: () => new Promise<number>((resolve) => {
        resolveSnapshot = resolve
      }),
      addLevelListener: (listener: (event: { batteryLevel: number }) => void) => {
        levelListener = listener
        return () => {}
      },
    })
    const seen: number[] = []
    function Reader() {
      seen.push(useBatteryLevel())
      return null
    }
    let root: ReturnType<typeof create>
    act(() => {
      root = create(<Reader />)
    })
    act(() => {
      levelListener({ batteryLevel: 0.8 })
    })
    expect(last(seen)).toBe(0.8)
    await act(async () => {
      resolveSnapshot(0.7)
    })
    expect(last(seen)).toBe(0.8)
    act(() => {
      root.unmount()
    })
  })

  it('useBatteryLevel still applies the initial snapshot with no event', async () => {
    let resolveSnapshot!: (level: number) => void
    const { useBatteryLevel } = await loadNativeEntry({
      getLevel: () => new Promise<number>((resolve) => {
        resolveSnapshot = resolve
      }),
      addLevelListener: () => () => {},
    })
    const seen: number[] = []
    function Reader() {
      seen.push(useBatteryLevel())
      return null
    }
    let root: ReturnType<typeof create>
    act(() => {
      root = create(<Reader />)
    })
    await act(async () => {
      resolveSnapshot(0.7)
    })
    expect(last(seen)).toBe(0.7)
    act(() => {
      root.unmount()
    })
  })

  it('useBatteryState keeps the live event over a late stale snapshot', async () => {
    let resolveSnapshot!: (state: 'charging') => void
    let stateListener!: (event: { batteryState: 'unplugged' }) => void
    const { useBatteryState } = await loadNativeEntry({
      getState: () => new Promise<'charging'>((resolve) => {
        resolveSnapshot = resolve
      }),
      addStateListener: (listener: (event: { batteryState: 'unplugged' }) => void) => {
        stateListener = listener
        return () => {}
      },
    })
    const seen: string[] = []
    function Reader() {
      seen.push(useBatteryState())
      return null
    }
    let root: ReturnType<typeof create>
    act(() => {
      root = create(<Reader />)
    })
    act(() => {
      stateListener({ batteryState: 'unplugged' })
    })
    expect(last(seen)).toBe('unplugged')
    await act(async () => {
      resolveSnapshot('charging')
    })
    expect(last(seen)).toBe('unplugged')
    act(() => {
      root.unmount()
    })
  })

  it('useLowPowerMode keeps the live event over a late stale snapshot', async () => {
    let resolveSnapshot!: (enabled: boolean) => void
    let modeListener!: (event: { lowPowerMode: boolean }) => void
    const { useLowPowerMode } = await loadNativeEntry({
      isLowPowerModeEnabled: () => new Promise<boolean>((resolve) => {
        resolveSnapshot = resolve
      }),
      addLowPowerModeListener: (listener: (event: { lowPowerMode: boolean }) => void) => {
        modeListener = listener
        return () => {}
      },
    })
    const seen: boolean[] = []
    function Reader() {
      seen.push(useLowPowerMode())
      return null
    }
    let root: ReturnType<typeof create>
    act(() => {
      root = create(<Reader />)
    })
    act(() => {
      modeListener({ lowPowerMode: true })
    })
    expect(last(seen)).toBe(true)
    await act(async () => {
      resolveSnapshot(false)
    })
    expect(last(seen)).toBe(true)
    act(() => {
      root.unmount()
    })
  })

  it('usePowerState merges a stale snapshot around event-updated fields', async () => {
    let resolveSnapshot!: (power: {
      batteryLevel: number
      batteryState: 'charging'
      lowPowerMode: false
    }) => void
    let levelListener!: (event: { batteryLevel: number }) => void
    const { usePowerState } = await loadNativeEntry({
      getPowerState: () => new Promise<{
        batteryLevel: number
        batteryState: 'charging'
        lowPowerMode: false
      }>((resolve) => {
        resolveSnapshot = resolve
      }),
      addLevelListener: (listener: (event: { batteryLevel: number }) => void) => {
        levelListener = listener
        return () => {}
      },
      addStateListener: () => () => {},
      addLowPowerModeListener: () => () => {},
    })
    const seen: { batteryLevel: number; batteryState: string; lowPowerMode: boolean }[] = []
    function Reader() {
      seen.push(usePowerState())
      return null
    }
    let root: ReturnType<typeof create>
    act(() => {
      root = create(<Reader />)
    })
    act(() => {
      levelListener({ batteryLevel: 0.8 })
    })
    expect(last(seen).batteryLevel).toBe(0.8)
    await act(async () => {
      resolveSnapshot({ batteryLevel: 0.7, batteryState: 'charging', lowPowerMode: false })
    })
    expect(last(seen)).toEqual({
      batteryLevel: 0.8,
      batteryState: 'charging',
      lowPowerMode: false,
    })
    act(() => {
      root.unmount()
    })
  })

  it('usePowerState applies the full snapshot with no event', async () => {
    const { usePowerState } = await loadNativeEntry({
      getPowerState: async () => ({
        batteryLevel: 0.7,
        batteryState: 'charging',
        lowPowerMode: false,
      }),
      addLevelListener: () => () => {},
      addStateListener: () => () => {},
      addLowPowerModeListener: () => () => {},
    })
    const seen: { batteryLevel: number; batteryState: string; lowPowerMode: boolean }[] = []
    function Reader() {
      seen.push(usePowerState())
      return null
    }
    let root: ReturnType<typeof create>
    act(() => {
      root = create(<Reader />)
    })
    await act(async () => {})
    expect(last(seen)).toEqual({
      batteryLevel: 0.7,
      batteryState: 'charging',
      lowPowerMode: false,
    })
    act(() => {
      root.unmount()
    })
  })
})

describe('battery web hooks stale initial snapshot', () => {
  it('useBatteryLevel keeps the live event over a late stale snapshot', async () => {
    vi.resetModules()
    const live = makeWebManager(0.8)
    const stale = makeWebManager(0.7)
    let calls = 0
    let resolveInitial!: (manager: unknown) => void
    vi.stubGlobal('navigator', {
      getBattery: () => {
        calls += 1
        if (calls === 1)
          return new Promise((resolve) => {
            resolveInitial = resolve
          })
        return Promise.resolve(live)
      },
    })
    vi.stubGlobal('window', {})
    const { useBatteryLevel } = await import('../src/platform/battery/index')
    const seen: number[] = []
    function Reader() {
      seen.push(useBatteryLevel())
      return null
    }
    let root: ReturnType<typeof create>
    act(() => {
      root = create(<Reader />)
    })
    await act(async () => {})
    act(() => {
      live.fire('levelchange')
    })
    await act(async () => {})
    expect(last(seen)).toBe(0.8)
    await act(async () => {
      resolveInitial(stale)
    })
    expect(last(seen)).toBe(0.8)
    act(() => {
      root.unmount()
    })
  })
})
