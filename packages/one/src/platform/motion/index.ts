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

const unsupported = (): never => {
  throw new Error('Motion requires an iOS or Android native build')
}

export const Motion = Object.freeze({
  getAvailability: (): MotionAvailability => unsupported(),
  addListener: (
    _sensor: MotionSensor,
    _intervalMs: number,
    _onReading: (reading: MotionReading) => void,
    _onError: (code: string, message: string) => void
  ): (() => void) => unsupported(),
})
