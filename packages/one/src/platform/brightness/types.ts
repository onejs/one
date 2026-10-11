// screen brightness through the platform apis, matching expo-brightness's
// parameters, payload fields and values. the function names drop expo's
// Async suffix and the words that repeat the namespace.
export type BrightnessMode = 'unknown' | 'automatic' | 'manual'

export type BrightnessPermissionStatus = 'granted' | 'denied' | 'undetermined'

export interface BrightnessPermissionResponse {
  status: BrightnessPermissionStatus
  granted: boolean
  canAskAgain: boolean
}

export interface BrightnessEvent {
  brightness: number
}

export interface BrightnessSubscription {
  remove(): void
}
