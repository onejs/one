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
  if (!['accelerometer', 'gyroscope', 'magnetometer', 'deviceMotion'].includes(sensor))
    throw new TypeError('Motion.addListener requires a supported sensor')
  if (!Number.isFinite(intervalMs) || intervalMs < 0 || intervalMs > 1000)
    throw new RangeError('Motion.addListener intervalMs must be between 0 and 1000')
  if (typeof onReading !== 'function' || typeof onError !== 'function')
    throw new TypeError('Motion.addListener requires reading and error callbacks')
  return native().addListener(sensor, intervalMs, onReading, onError)
}

export const Motion = Object.freeze({ getAvailability, addListener })
