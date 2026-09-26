import { Platform } from 'react-native'
import { NitroModules } from 'react-native-nitro-modules'
import { rethrowNativeError } from '../nativeError'
import type {
  LocationPermissionStatus,
  LocationPosition,
  OneLocation,
} from '../specs/OneLocation.nitro'

export type { LocationPermissionStatus, LocationPosition }

let hybrid: OneLocation | undefined

function native(): OneLocation {
  if (Platform.OS !== 'ios') throw new Error('Location requires an iOS native build')
  hybrid ??= NitroModules.createHybridObject<OneLocation>('OneLocation')
  return hybrid
}

function getPermissionStatus(): LocationPermissionStatus {
  try {
    return native().getPermissionStatus()
  } catch (error) {
    return rethrowNativeError(error)
  }
}

function requestWhenInUsePermission(): Promise<LocationPermissionStatus> {
  return native().requestWhenInUsePermission().catch(rethrowNativeError)
}

function getCurrentPosition(): Promise<LocationPosition> {
  return native().getCurrentPosition().catch(rethrowNativeError)
}

export const Location = Object.freeze({
  getPermissionStatus,
  requestWhenInUsePermission,
  getCurrentPosition,
})
