import { validateListener } from './validate'
import type {
  MotionAvailability,
  MotionReading,
  MotionSensor,
  MotionVector,
} from '../specs/OneMotion.nitro'
export type {
  MotionAvailability,
  MotionReading,
  MotionSensor,
  MotionVector,
} from '../specs/OneMotion.nitro'

const emptyAvailability: MotionAvailability = {
  accelerometer: false,
  gyroscope: false,
  magnetometer: false,
  deviceMotion: false,
}
const availability = { ...emptyAvailability }
const listeners = new Set<{
  sensor: MotionSensor
  intervalMs: number
  last: number
  onReading: (reading: MotionReading) => void
  onError: (code: string, message: string) => void
}>()
let observing = false
let attitude: MotionVector | undefined
function vector(
  x: number | null | undefined,
  y: number | null | undefined,
  z: number | null | undefined,
  scale = 1
): MotionVector | undefined {
  return [x, y, z].every((value) => typeof value === 'number' && Number.isFinite(value))
    ? { x: x! * scale, y: y! * scale, z: z! * scale }
    : undefined
}
function receive(event: DeviceMotionEvent): void {
  const total = event.accelerationIncludingGravity,
    linear = event.acceleration,
    rate = event.rotationRate
  const acceleration = vector(total?.x, total?.y, total?.z, -1 / 9.80665)
  const user = vector(linear?.x, linear?.y, linear?.z, -1 / 9.80665)
  const rotation = vector(rate?.beta, rate?.gamma, rate?.alpha, Math.PI / 180)
  availability.accelerometer = !!acceleration
  availability.gyroscope = !!rotation
  availability.deviceMotion = !!user
  const gravity =
    acceleration && user
      ? {
          x: acceleration.x - user.x,
          y: acceleration.y - user.y,
          z: acceleration.z - user.z,
        }
      : undefined
  for (const listener of [...listeners]) {
    if (!listeners.has(listener)) continue
    const value =
      listener.sensor === 'accelerometer'
        ? acceleration
        : listener.sensor === 'gyroscope'
          ? rotation
          : listener.sensor === 'deviceMotion'
            ? user
            : undefined
    if (!value || event.timeStamp - listener.last < listener.intervalMs) continue
    listener.last = event.timeStamp
    const reading: MotionReading = {
      sensor: listener.sensor,
      timestampMs: performance.timeOrigin + event.timeStamp,
      value,
    }
    if (listener.sensor === 'deviceMotion')
      Object.assign(reading, {
        gravity,
        userAcceleration: user,
        rotationRate: rotation,
        attitude,
      })
    listener.onReading(reading)
  }
  if (!listeners.size) stopObserving()
}
function orient(event: DeviceOrientationEvent): void {
  // convert the browser's intrinsic z-x-y rotation to roll/pitch/yaw (z-y-x).
  const a = event.alpha,
    b = event.beta,
    c = event.gamma
  if (!vector(a, b, c)) {
    attitude = undefined
    return
  }
  const z = (a! * Math.PI) / 180,
    x = (b! * Math.PI) / 180,
    y = (c! * Math.PI) / 180
  attitude = {
    x: Math.atan2(Math.sin(x), Math.cos(x) * Math.cos(y)),
    y: Math.asin(Math.max(-1, Math.min(1, Math.cos(x) * Math.sin(y)))),
    z: Math.atan2(
      Math.sin(z) * Math.cos(y) + Math.cos(z) * Math.sin(x) * Math.sin(y),
      Math.cos(z) * Math.cos(y) - Math.sin(z) * Math.sin(x) * Math.sin(y)
    ),
  }
}
function stopObserving(): void {
  if (!observing) return
  window.removeEventListener('devicemotion', receive)
  window.removeEventListener('deviceorientation', orient)
  observing = false
  attitude = undefined
}
function observe(): void {
  if (observing || typeof window === 'undefined') return
  observing = true
  window.addEventListener('devicemotion', receive)
  window.addEventListener('deviceorientation', orient)
}
export const Motion = Object.freeze({
  getAvailability: (): MotionAvailability => {
    if (typeof window === 'undefined' || !window.DeviceMotionEvent)
      return { ...emptyAvailability }
    observe()
    return { ...availability }
  },
  addListener: (
    sensor: MotionSensor,
    intervalMs: number,
    onReading: (reading: MotionReading) => void,
    onError: (code: string, message: string) => void
  ): (() => void) => {
    validateListener(sensor, intervalMs, onReading, onError)
    if (typeof window === 'undefined') return () => {}
    if (sensor === 'magnetometer' || !window.DeviceMotionEvent) {
      onError('E_MOTION_UNAVAILABLE', 'Motion.addListener: sensor is unavailable')
      return () => {}
    }
    observe()
    const listener = { sensor, intervalMs, last: -Infinity, onReading, onError }
    listeners.add(listener)
    const constructor = window.DeviceMotionEvent as typeof DeviceMotionEvent & {
      requestPermission?: () => Promise<string>
    }
    if (constructor.requestPermission) {
      const fail = (message: string) => {
        if (!listeners.delete(listener)) return
        if (!listeners.size) stopObserving()
        onError('E_MOTION_PERMISSION', message)
      }
      try {
        constructor.requestPermission().then((permission) => {
          if (permission !== 'granted')
            fail('Motion.addListener: motion permission is required')
        }).catch((error) => fail(String(error)))
      } catch (error) {
        fail(String(error))
      }
    }
    return () => {
      listeners.delete(listener)
      if (!listeners.size) stopObserving()
    }
  },
})
