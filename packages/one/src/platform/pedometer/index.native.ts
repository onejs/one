import { NitroModules } from 'react-native-nitro-modules'
import { rethrowNativeError } from '../nativeError'
import type { OnePedometer } from '../specs/OnePedometer.nitro'
import type {
  PedometerPermissionResponse,
  PedometerResult,
  PedometerSubscription,
} from './types'
import { assertStepCountListener, assertStepCountRange } from './validate'

export type {
  PedometerPermissionResponse,
  PedometerPermissionStatus,
  PedometerResult,
  PedometerSubscription,
} from './types'

// step counting matching expo-sensors' Pedometer, backed by the
// OnePedometer nitro hybrid object (created on first use and cached). the
// first watch starts the native pedometer, so the first event can never
// race the subscription.
let hybrid: OnePedometer | undefined

function native(): OnePedometer {
  hybrid ??= NitroModules.createHybridObject<OnePedometer>('OnePedometer')
  return hybrid
}

function isAvailable(): boolean {
  return native().isAvailable()
}

function watchStepCount(listener: (result: PedometerResult) => void): PedometerSubscription {
  assertStepCountListener(listener)
  const remove = native().watchStepCount(listener)
  return { remove: () => remove() }
}

function getStepCount(start: Date, end: Date): Promise<PedometerResult> {
  assertStepCountRange(start, end)
  return native().getStepCount(start.getTime(), end.getTime()).catch(rethrowNativeError)
}

function getPermissions(): Promise<PedometerPermissionResponse> {
  return native().getPermissions().catch(rethrowNativeError)
}

function requestPermissions(): Promise<PedometerPermissionResponse> {
  return native().requestPermissions().catch(rethrowNativeError)
}

export const Pedometer = Object.freeze({
  isAvailable,
  watchStepCount,
  getStepCount,
  getPermissions,
  requestPermissions,
})
