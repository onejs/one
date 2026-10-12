import type { HybridObject } from 'react-native-nitro-modules'
import type { BarometerMeasurement } from '../barometer/types'

// air pressure behind One.Barometer, matching expo-sensors' Barometer.
// isAvailable is synchronous. setUpdateInterval paces android delivery; ios
// accepts it and delivers at the altimeter rate, matching expo.
export interface OneBarometer extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  isAvailable(): boolean
  setUpdateInterval(intervalMs: number): void
  addListener(listener: (event: BarometerMeasurement) => void): () => void
}
