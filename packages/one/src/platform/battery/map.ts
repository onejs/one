import type { BatteryState } from './types'

// UIDevice battery states to the spec union. unknown stays unknown and any
// future case falls back to unknown, as the swift's @unknown default did;
// notCharging is android-only and never comes from ios.
export function mapBatteryState(state: string): BatteryState {
  switch (state) {
    case 'unplugged':
      return 'unplugged'
    case 'charging':
      return 'charging'
    case 'full':
      return 'full'
    default:
      return 'unknown'
  }
}
