import type { LightSensorSubscription } from './types'
import { assertLightSensorListener, assertUpdateInterval } from './validate'

export type { LightSensorMeasurement, LightSensorSubscription } from './types'

// web entry. same signatures as the native entry: the published
// declarations are built from this file and serve both platforms. the
// generic-sensor AmbientLightSensor supplies live lux where the browser
// has it; without it the sensor reads unavailable and listeners never fire.
interface WebLightSensor extends EventTarget {
  readonly illuminance: number
  start(): void
  stop(): void
}

type WebLightSensorCtor = new () => WebLightSensor

function lightSensorCtor(): WebLightSensorCtor | undefined {
  if (typeof window === 'undefined') return undefined
  const ctor = (window as { AmbientLightSensor?: unknown }).AmbientLightSensor
  return typeof ctor === 'function' ? (ctor as WebLightSensorCtor) : undefined
}

function isAvailable(): boolean {
  return lightSensorCtor() !== undefined
}

function setUpdateInterval(intervalMs: number): void {
  assertUpdateInterval(intervalMs)
}

function addListener(
  listener: (event: { illuminance: number; timestamp: number }) => void
): LightSensorSubscription {
  assertLightSensorListener(listener)
  const Ctor = lightSensorCtor()
  if (!Ctor) return { remove: () => {} }
  let sensor: WebLightSensor | undefined
  const onReading = () => {
    if (sensor) listener({ illuminance: sensor.illuminance, timestamp: Date.now() / 1000 })
  }
  try {
    sensor = new Ctor()
    sensor.addEventListener('reading', onReading)
    sensor.start()
  } catch {
    sensor = undefined
    return { remove: () => {} }
  }
  return {
    remove: () => {
      sensor?.removeEventListener('reading', onReading)
      try {
        sensor?.stop()
      } catch {
        // already stopped
      }
      sensor = undefined
    },
  }
}

export const LightSensor = Object.freeze({
  isAvailable,
  setUpdateInterval,
  addListener,
})
