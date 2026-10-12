import type { BatteryLevelEvent, BatteryPowerModeEvent, BatteryStateEvent } from './types'

// shared argument checks: identical checks and messages on web and native.
export function assertLevelListener(
  listener: unknown
): asserts listener is (event: BatteryLevelEvent) => void {
  if (typeof listener !== 'function') {
    throw new Error('Battery.addLevelListener: listener must be a function')
  }
}

export function assertStateListener(
  listener: unknown
): asserts listener is (event: BatteryStateEvent) => void {
  if (typeof listener !== 'function') {
    throw new Error('Battery.addStateListener: listener must be a function')
  }
}

export function assertLowPowerModeListener(
  listener: unknown
): asserts listener is (event: BatteryPowerModeEvent) => void {
  if (typeof listener !== 'function') {
    throw new Error('Battery.addLowPowerModeListener: listener must be a function')
  }
}
