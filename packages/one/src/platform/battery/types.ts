// battery state through the platform power APIs, matching expo-battery's
// parameters, payload fields and values. the function names drop expo's
// Async suffix and the words that repeat the namespace.
export type BatteryState = 'unknown' | 'unplugged' | 'charging' | 'full' | 'notCharging'

export interface BatteryLevelEvent {
  batteryLevel: number
}

export interface BatteryStateEvent {
  batteryState: BatteryState
}

export interface BatteryPowerModeEvent {
  lowPowerMode: boolean
}

export interface BatteryPowerState {
  batteryLevel: number
  batteryState: BatteryState
  lowPowerMode: boolean
}

export interface BatterySubscription {
  remove(): void
}
