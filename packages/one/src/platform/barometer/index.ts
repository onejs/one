import type { BarometerSubscription } from './types'
import { assertBarometerListener, assertUpdateInterval } from './validate'

export type { BarometerMeasurement, BarometerSubscription } from './types'

// web entry. same signatures as the native entry: the published
// declarations are built from this file and serve both platforms. browsers
// expose no barometer api, so the sensor reads unavailable, the interval is
// accepted and ignored, and listeners never fire.
function isAvailable(): boolean {
  return false
}

function setUpdateInterval(intervalMs: number): void {
  assertUpdateInterval(intervalMs)
}

function addListener(
  listener: (event: { pressure: number; timestamp: number }) => void
): BarometerSubscription {
  assertBarometerListener(listener)
  return { remove: () => {} }
}

export const Barometer = Object.freeze({
  isAvailable,
  setUpdateInterval,
  addListener,
})
