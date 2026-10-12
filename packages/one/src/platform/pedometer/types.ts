// step counting through the platform pedometers, matching expo-sensors'
// parameters, payload fields and values. the function names drop expo's
// Async suffix and the words that repeat the namespace.
export interface PedometerResult {
  steps: number
}

export type PedometerPermissionStatus = 'granted' | 'denied' | 'undetermined'

export interface PedometerPermissionResponse {
  status: PedometerPermissionStatus
  granted: boolean
  canAskAgain: boolean
}

export interface PedometerSubscription {
  remove(): void
}
