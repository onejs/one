import { NitroModules } from 'react-native-nitro-modules'
import type { OneLightSensor } from '../specs/OneLightSensor.nitro'
import type { LightSensorMeasurement, LightSensorSubscription } from './types'
import { assertLightSensorListener, assertUpdateInterval } from './validate'

export type { LightSensorMeasurement, LightSensorSubscription } from './types'

// ambient light matching expo-sensors' LightSensor, backed by the
// OneLightSensor nitro hybrid object (created on first use and cached).
// the first listener starts the native sensor, so the first event can
// never race the subscription.
let hybrid: OneLightSensor | undefined

function native(): OneLightSensor {
  hybrid ??= NitroModules.createHybridObject<OneLightSensor>('OneLightSensor')
  return hybrid
}

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
