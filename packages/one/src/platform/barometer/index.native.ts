import { NitroModules } from 'react-native-nitro-modules'
import type { OneBarometer } from '../specs/OneBarometer.nitro'
import type { BarometerMeasurement, BarometerSubscription } from './types'
import { assertBarometerListener, assertUpdateInterval } from './validate'

export type { BarometerMeasurement, BarometerSubscription } from './types'

// air pressure matching expo-sensors' Barometer, backed by the OneBarometer
// nitro hybrid object (created on first use and cached). the first listener
// starts the native sensor, so the first event can never race the
// subscription.
let hybrid: OneBarometer | undefined

function native(): OneBarometer {
  hybrid ??= NitroModules.createHybridObject<OneBarometer>('OneBarometer')
  return hybrid
}

function isAvailable(): boolean {
  return native().isAvailable()
}

function setUpdateInterval(intervalMs: number): void {
  assertUpdateInterval(intervalMs)
  native().setUpdateInterval(intervalMs)
}

function addListener(listener: (event: BarometerMeasurement) => void): BarometerSubscription {
  assertBarometerListener(listener)
  const remove = native().addListener(listener)
  return { remove: () => remove() }
}

export const Barometer = Object.freeze({
  isAvailable,
  setUpdateInterval,
  addListener,
})
