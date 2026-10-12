import type { LightSensorMeasurement } from './types'

// shared argument checks: identical checks and messages on web and native.
export function assertLightSensorListener(
  listener: unknown
): asserts listener is (event: LightSensorMeasurement) => void {
  if (typeof listener !== 'function') {
    throw new Error('LightSensor.addListener: listener must be a function')
  }
}

export function assertUpdateInterval(intervalMs: unknown): asserts intervalMs is number {
  if (typeof intervalMs !== 'number' || !Number.isFinite(intervalMs) || intervalMs < 0) {
    throw new Error('LightSensor.setUpdateInterval: interval must be a finite number at least 0')
  }
}
