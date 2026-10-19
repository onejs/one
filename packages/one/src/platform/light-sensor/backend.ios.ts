import type { LightSensorBackend, LightSensorMeasurement } from './types'

// ios exposes no public ambient light api, so the sensor reads unavailable
// and listeners never fire, matching the old swift backend exactly.
function isAvailable(): boolean {
  return false
}

function setUpdateInterval(_intervalMs: number): void {
  // no sensor to pace.
}

function addListener(
  _listener: (event: LightSensorMeasurement) => void
): () => void {
  return () => {}
}

const backend = {
  isAvailable,
  setUpdateInterval,
  addListener,
} satisfies LightSensorBackend

export function lightSensorNative() {
  return backend
}
