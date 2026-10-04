import { validateListener } from './validate'
import type {
  MotionAvailability,
  MotionReading,
  MotionSensor,
} from '../specs/OneMotion.nitro'

export type {
  MotionAvailability,
  MotionReading,
  MotionSensor,
  MotionVector,
} from '../specs/OneMotion.nitro'

export const Motion = Object.freeze({
  getAvailability: (): MotionAvailability => ({
    accelerometer: false,
    gyroscope: false,
    magnetometer: false,
    deviceMotion: false,
  }),
  addListener: (
    sensor: MotionSensor,
    intervalMs: number,
    onReading: (reading: MotionReading) => void,
    onError: (code: string, message: string) => void
  ): (() => void) => {
    validateListener(sensor, intervalMs, onReading, onError)
    return () => {}
  },
})
