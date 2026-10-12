import { missingNativeBuild } from '../nativeError'
import type { PedometerPermissionResponse, PedometerSubscription } from './types'
import { assertStepCountListener, assertStepCountRange } from './validate'

export type {
  PedometerPermissionResponse,
  PedometerPermissionStatus,
  PedometerResult,
  PedometerSubscription,
} from './types'

// web entry. same signatures as the native entry: the published
// declarations are built from this file and serve both platforms. browsers
// expose no pedometer api, so the sensor reads unavailable, watches never
// fire, history rejects for the missing native build, and permissions read
// denied.
function isAvailable(): boolean {
  return false
}

function watchStepCount(
  listener: (result: { steps: number }) => void
): PedometerSubscription {
  assertStepCountListener(listener)
  return { remove: () => {} }
}

function getStepCount(start: Date, end: Date): Promise<{ steps: number }> {
  assertStepCountRange(start, end)
  return Promise.reject(missingNativeBuild('Pedometer.getStepCount'))
}

async function denied(): Promise<PedometerPermissionResponse> {
  return { status: 'denied', granted: false, canAskAgain: false }
}

function getPermissions(): Promise<PedometerPermissionResponse> {
  return denied()
}

function requestPermissions(): Promise<PedometerPermissionResponse> {
  return denied()
}

export const Pedometer = Object.freeze({
  isAvailable,
  watchStepCount,
  getStepCount,
  getPermissions,
  requestPermissions,
})
