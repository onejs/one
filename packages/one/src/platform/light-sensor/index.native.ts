import { lightSensorNative as native } from './backend'
import type { LightSensorMeasurement, LightSensorSubscription } from './types'
import { assertLightSensorListener, assertUpdateInterval } from './validate'

export type { LightSensorMeasurement, LightSensorSubscription } from './types'

// ambient light matching expo-sensors' LightSensor, backed by the platform
// backend (generated-free js on ios, the cached OneLightSensor nitro hybrid
// object everywhere else). the first listener starts the native sensor, so
// the first event can never race the subscription.
function isAvailable(): boolean {
  return native().isAvailable()
}

function setUpdateInterval(intervalMs: number): void {
  assertUpdateInterval(intervalMs)
  native().setUpdateInterval(intervalMs)
}

function addListener(
  listener: (event: LightSensorMeasurement) => void
): LightSensorSubscription {
  assertLightSensorListener(listener)
  const remove = native().addListener(listener)
  return { remove: () => remove() }
}

export const LightSensor = Object.freeze({
  isAvailable,
  setUpdateInterval,
  addListener,
})
