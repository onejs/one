import { useEffect, useState } from 'react'
import { NitroModules } from 'react-native-nitro-modules'
import { rethrowNativeError } from '../nativeError'
import type { OneBattery } from '../specs/OneBattery.nitro'
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
// the OneBattery nitro hybrid object (created on first use and cached).
// the first listener starts the native monitor, so the first event can
// never race the subscription.
let hybrid: OneBattery | undefined

function native(): OneBattery {
  hybrid ??= NitroModules.createHybridObject<OneBattery>('OneBattery')
  return hybrid
}

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
    getLevel()
      .then((next) => {
        if (active) setLevel(next)
      })
      .catch(() => {})
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
    getState()
      .then((next) => {
        if (active) setState(next)
      })
      .catch(() => {})
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
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    let active = true
    isLowPowerModeEnabled()
      .then((next) => {
        if (active) setEnabled(next)
      })
      .catch(() => {})
    const subscription = addLowPowerModeListener((event) => {
      if (active) setEnabled(event.lowPowerMode)
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
    getPowerState()
      .then((next) => {
        if (active) setPower(next)
      })
      .catch(() => {})
    const onLevel = addLevelListener((event) => {
      if (active)
        setPower((current) => ({ ...current, batteryLevel: event.batteryLevel }))
    })
    const onState = addStateListener((event) => {
      if (active)
        setPower((current) => ({ ...current, batteryState: event.batteryState }))
    })
    const onMode = addLowPowerModeListener((event) => {
      if (active)
        setPower((current) => ({ ...current, lowPowerMode: event.lowPowerMode }))
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
