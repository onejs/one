import type { HybridObject } from 'react-native-nitro-modules'
import type { LightSensorMeasurement } from '../light-sensor/types'

// ambient light behind One.LightSensor, matching expo-sensors'
// LightSensor: android only, since ios exposes no ambient light api.
// isAvailable is synchronous. setUpdateInterval paces android delivery.
export interface OneLightSensor extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  isAvailable(): boolean
  setUpdateInterval(intervalMs: number): void
  addListener(listener: (event: LightSensorMeasurement) => void): () => void
}
