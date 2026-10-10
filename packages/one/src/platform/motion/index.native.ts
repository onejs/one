import { validateListener } from './validate'
import { NitroModules } from 'react-native-nitro-modules'
import type {
  MotionAvailability,
  MotionReading,
  MotionSensor,
  OneMotion,
} from '../specs/OneMotion.nitro'

export type {
  MotionAvailability,
  MotionReading,
  MotionSensor,
  MotionVector,
} from '../specs/OneMotion.nitro'

let hybrid: OneMotion | undefined

function native(): OneMotion {
  hybrid ??= NitroModules.createHybridObject<OneMotion>('OneMotion')
  return hybrid
}

function getAvailability(): MotionAvailability {
  return native().getAvailability()
}

function addListener(
  sensor: MotionSensor,
  intervalMs: number,
  onReading: (reading: MotionReading) => void,
  onError: (code: string, message: string) => void
): () => void {
  validateListener(sensor, intervalMs, onReading, onError)
  return native().addListener(sensor, intervalMs, onReading, onError)
}

export const Motion = Object.freeze({ getAvailability, addListener })
