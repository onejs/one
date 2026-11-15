import { useEffect, useState } from 'react'
import { batteryNative as native } from './backend'
import { rethrowNativeError } from '../nativeError'
import type {
  BatteryLevelEvent,
  BatteryPowerModeEvent,
  BatteryPowerState,
  BatteryState,
  BatteryStateEvent,
  BatterySubscription,
} from './types'
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

// battery level, state and low power mode matching expo-battery, backed by
// the battery backend: generated sdk bindings on ios, the OneBattery nitro
// hybrid object everywhere else. the first listener starts the native
// monitor, so the first event can never race the subscription.

function getLevel(): Promise<number> {
  return native().getLevel().catch(rethrowNativeError)
}

function getState(): Promise<BatteryState> {
  return native().getState().catch(rethrowNativeError)
}

function getPowerState(): Promise<BatteryPowerState> {
  return native().getPowerState().catch(rethrowNativeError)
}

function isLowPowerModeEnabled(): Promise<boolean> {
  return native().isLowPowerModeEnabled().catch(rethrowNativeError)
}

function isAvailable(): boolean {
  return native().isAvailable()
}

function addLevelListener(
  listener: (event: BatteryLevelEvent) => void
): BatterySubscription {
  assertLevelListener(listener)
  const remove = native().addLevelListener(listener)
  return { remove: () => remove() }
}

function addStateListener(
  listener: (event: BatteryStateEvent) => void
): BatterySubscription {
  assertStateListener(listener)
  const remove = native().addStateListener(listener)
  return { remove: () => remove() }
}

function addLowPowerModeListener(
  listener: (event: BatteryPowerModeEvent) => void
): BatterySubscription {
  assertLowPowerModeListener(listener)
  const remove = native().addLowPowerModeListener(listener)
  return { remove: () => remove() }
}

function useBatteryLevel(): number {
  const [level, setLevel] = useState(-1)
  useEffect(() => {
    let active = true
    let fromEvent = false
    getLevel()
      .then((next) => {
        if (active && !fromEvent) setLevel(next)
      })
      .catch(() => {})
    const subscription = addLevelListener((event) => {
      if (active) {
        fromEvent = true
        setLevel(event.batteryLevel)
      }
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
    let fromEvent = false
    getState()
      .then((next) => {
        if (active && !fromEvent) setState(next)
      })
      .catch(() => {})
    const subscription = addStateListener((event) => {
      if (active) {
        fromEvent = true
        setState(event.batteryState)
      }
    })
    return () => {
      active = false
      subscription.remove()
    }
  }, [])
  return state
}

function useLowPowerMode(): boolean {
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    let active = true
    let fromEvent = false
    isLowPowerModeEnabled()
      .then((next) => {
        if (active && !fromEvent) setEnabled(next)
      })
      .catch(() => {})
    const subscription = addLowPowerModeListener((event) => {
      if (active) {
        fromEvent = true
        setEnabled(event.lowPowerMode)
      }
    })
    return () => {
      active = false
      subscription.remove()
    }
  }, [])
  return enabled
}

function usePowerState(): BatteryPowerState {
  const [power, setPower] = useState<BatteryPowerState>({
    batteryLevel: -1,
    batteryState: 'unknown',
    lowPowerMode: false,
  })
  useEffect(() => {
    let active = true
    let levelFromEvent = false
    let stateFromEvent = false
    let modeFromEvent = false
    getPowerState()
      .then((next) => {
        if (!active) return
        setPower((current) => ({
          batteryLevel: levelFromEvent ? current.batteryLevel : next.batteryLevel,
          batteryState: stateFromEvent ? current.batteryState : next.batteryState,
          lowPowerMode: modeFromEvent ? current.lowPowerMode : next.lowPowerMode,
        }))
      })
      .catch(() => {})
    const onLevel = addLevelListener((event) => {
      if (active) {
        levelFromEvent = true
        setPower((current) => ({ ...current, batteryLevel: event.batteryLevel }))
      }
    })
    const onState = addStateListener((event) => {
      if (active) {
        stateFromEvent = true
        setPower((current) => ({ ...current, batteryState: event.batteryState }))
      }
    })
    const onMode = addLowPowerModeListener((event) => {
      if (active) {
        modeFromEvent = true
        setPower((current) => ({ ...current, lowPowerMode: event.lowPowerMode }))
      }
    })
    return () => {
      active = false
      onLevel.remove()
      onState.remove()
      onMode.remove()
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
