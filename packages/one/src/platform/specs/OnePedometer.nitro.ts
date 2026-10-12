import type { HybridObject } from 'react-native-nitro-modules'
import type { PedometerPermissionResponse, PedometerResult } from '../pedometer/types'

// step counting behind One.Pedometer, matching expo-sensors' Pedometer.
// isAvailable is synchronous. watchStepCount streams steps since the watch
// started on both platforms; getStepCount queries the ios seven-day
// history and rejects on android, matching expo.
export interface OnePedometer extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  isAvailable(): boolean
  watchStepCount(listener: (result: PedometerResult) => void): () => void
  getStepCount(startMs: number, endMs: number): Promise<PedometerResult>
  getPermissions(): Promise<PedometerPermissionResponse>
  requestPermissions(): Promise<PedometerPermissionResponse>
}
