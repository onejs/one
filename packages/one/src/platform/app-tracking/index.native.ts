import type { appTrackingNative } from './backend'
import { Platform } from 'react-native'
import { rethrowNativeError } from '../nativeError'
import type { AppTrackingPermissionStatus } from '../specs/OneAppTracking.nitro'
import { AppTracking as unavailableAppTracking } from './unavailable'

// required on first use: the ios backend evaluates its framework bindings on load
const native: typeof appTrackingNative = () => require('./backend').appTrackingNative()

export type { AppTrackingPermissionStatus } from '../specs/OneAppTracking.nitro'

function getPermissionStatus(): AppTrackingPermissionStatus {
  try {
    return native().getPermissionStatus()
  } catch (error) {
    return rethrowNativeError(error)
  }
}

function requestPermission(): Promise<AppTrackingPermissionStatus> {
  return native().requestPermission().catch(rethrowNativeError)
}

const nativeAppTracking = Object.freeze({ getPermissionStatus, requestPermission })

// App Tracking Transparency is iOS only, so Android keeps the unavailable contract
export const AppTracking: typeof nativeAppTracking =
  Platform.OS === 'android' ? unavailableAppTracking : nativeAppTracking
