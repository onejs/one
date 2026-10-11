import { useEffect, useState } from 'react'
import type { BatteryPowerState, BatteryState, BatterySubscription } from './types'
import {
  assertLevelListener,
  assertLowPowerModeListener,
  assertStateListener,
} from './validate'

export type {
  BatteryLevelEvent,
  BatteryPowerModeEvent,
  BatteryPowerState,
  BatteryState,
  BatteryStateEvent,
  BatterySubscription,
} from './types'

// web entry. same signatures as the native entry: the published
// declarations are built from this file and serve both platforms. the
// battery status api supplies live level and charging state where the
// browser has it; without it reads resolve expo's web values (full,
// unknown, not low power) and listeners never fire.
interface WebBatteryManager extends EventTarget {
  readonly level: number
  readonly charging: boolean
}

function getBatteryFn(): (() => Promise<WebBatteryManager>) | undefined {
  if (typeof navigator === 'undefined') return undefined
  const getBattery = (navigator as { getBattery?: unknown }).getBattery
  return typeof getBattery === 'function'
    ? (getBattery as () => Promise<WebBatteryManager>)
    : undefined
}

async function systemBattery(): Promise<WebBatteryManager | undefined> {
  const getBattery = getBatteryFn()
  if (!getBattery) return undefined
  try {
    return await getBattery()
  } catch {
    return undefined
  }
}

async function getLevel(): Promise<number> {
  const battery = await systemBattery()
  return battery ? battery.level : 1
}

function stateOf(battery: WebBatteryManager | undefined): BatteryState {
  if (!battery) return 'unknown'
  return battery.charging ? 'charging' : 'unplugged'
}

async function getState(): Promise<BatteryState> {
  return stateOf(await systemBattery())
}

async function getPowerState(): Promise<BatteryPowerState> {
  const battery = await systemBattery()
  return {
    batteryLevel: battery ? battery.level : 1,
    batteryState: stateOf(battery),
    lowPowerMode: false,
  }
}

async function isLowPowerModeEnabled(): Promise<boolean> {
  return false
}

function isAvailable(): boolean {
  return getBatteryFn() !== undefined
}

function listen(
  event: 'levelchange' | 'chargingchange',
  listener: () => void
): BatterySubscription {
  if (typeof window === 'undefined')
    return {
      remove: () => {},
    }
  let removed = false
  void systemBattery().then((battery) => {
    if (removed) return
    battery?.addEventListener(event, listener)
  })
  return {
    remove: () => {
      removed = true
      void systemBattery().then((battery) => {
        battery?.removeEventListener(event, listener)
      })
    },
  }
}

function addLevelListener(
  listener: (event: { batteryLevel: number }) => void
): BatterySubscription {
  assertLevelListener(listener)
  return listen('levelchange', () => {
    void getLevel().then((batteryLevel) => listener({ batteryLevel }))
  })
}

function addStateListener(
  listener: (event: { batteryState: BatteryState }) => void
): BatterySubscription {
  assertStateListener(listener)
  return listen('chargingchange', () => {
    void getState().then((batteryState) => listener({ batteryState }))
  })
}

function addLowPowerModeListener(
  listener: (event: { lowPowerMode: boolean }) => void
): BatterySubscription {
  assertLowPowerModeListener(listener)
  return { remove: () => {} }
}

function useBatteryLevel(): number {
  const [level, setLevel] = useState(1)
  useEffect(() => {
    let active = true
    void getLevel().then((next) => {
      if (active) setLevel(next)
    })
    const subscription = addLevelListener((event) => {
      if (active) setLevel(event.batteryLevel)
    })
    return () => {
      active = false
      subscription.remove()
    }
  }, [])
  return level
}

function useBatteryState(): BatteryState {
  const [state, setState] = useState<BatteryState>('unknown')
  useEffect(() => {
    let active = true
    void getState().then((next) => {
      if (active) setState(next)
    })
    const subscription = addStateListener((event) => {
      if (active) setState(event.batteryState)
    })
    return () => {
      active = false
      subscription.remove()
    }
  }, [])
  return state
}

function useLowPowerMode(): boolean {
  const [enabled] = useState(false)
  return enabled
}

function usePowerState(): BatteryPowerState {
  const [power, setPower] = useState<BatteryPowerState>({
    batteryLevel: 1,
    batteryState: 'unknown',
    lowPowerMode: false,
  })
  useEffect(() => {
    let active = true
    void getPowerState().then((next) => {
      if (active) setPower(next)
    })
    const onLevel = addLevelListener((event) => {
      if (active)
        setPower((current) => ({ ...current, batteryLevel: event.batteryLevel }))
    })
    const onState = addStateListener((event) => {
      if (active)
        setPower((current) => ({ ...current, batteryState: event.batteryState }))
    })
    return () => {
      active = false
      onLevel.remove()
      onState.remove()
    }
  }, [])
  return power
}

export const Battery = Object.freeze({
  getLevel,
  getState,
  getPowerState,
  isLowPowerModeEnabled,
  isAvailable,
  addLevelListener,
  addStateListener,
  addLowPowerModeListener,
})
export { useBatteryLevel, useBatteryState, useLowPowerMode, usePowerState }
