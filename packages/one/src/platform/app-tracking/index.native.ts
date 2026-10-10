import { Platform } from 'react-native'
import { NitroModules } from 'react-native-nitro-modules'
import { rethrowNativeError } from '../nativeError'
import type { AppTrackingPermissionStatus, OneAppTracking } from '../specs/OneAppTracking.nitro'
import { AppTracking as unavailableAppTracking } from './unavailable'

export type { AppTrackingPermissionStatus } from '../specs/OneAppTracking.nitro'

let hybrid: OneAppTracking | undefined

function native(): OneAppTracking {
  if (Platform.OS !== 'ios') throw new Error('AppTracking requires an iOS native build')
  hybrid ??= NitroModules.createHybridObject<OneAppTracking>('OneAppTracking')
  return hybrid
}

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
