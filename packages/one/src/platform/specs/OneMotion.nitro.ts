import type { HybridObject } from 'react-native-nitro-modules'

export type MotionSensor = 'accelerometer' | 'gyroscope' | 'magnetometer' | 'deviceMotion'

export interface MotionAvailability {
  accelerometer: boolean
  gyroscope: boolean
  magnetometer: boolean
  deviceMotion: boolean
}

export interface MotionVector {
  x: number
  y: number
  z: number
}

export interface MotionReading {
  sensor: MotionSensor
  timestampMs: number
  value: MotionVector
  gravity?: MotionVector
  userAcceleration?: MotionVector
  rotationRate?: MotionVector
  attitude?: MotionVector
}

export interface OneMotion extends HybridObject<{ ios: 'swift' }> {
  getAvailability(): MotionAvailability
  addListener(
    sensor: MotionSensor,
    intervalMs: number,
    onReading: (reading: MotionReading) => void,
    onError: (code: string, message: string) => void
  ): () => void
}
