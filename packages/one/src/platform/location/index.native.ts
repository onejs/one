import { Platform } from 'react-native'
import { NitroModules } from 'react-native-nitro-modules'
import { rethrowNativeError } from '../nativeError'
import type {
  LocationPermissionStatus,
  LocationPosition,
  LocationPlace,
  OneLocation,
} from '../specs/OneLocation.nitro'

export type { LocationPermissionStatus, LocationPosition, LocationPlace }

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

export type LocationWatchError = Error & { code: string }

function watchPosition(
  onPosition: (position: LocationPosition) => void,
  onError: (error: LocationWatchError) => void,
  options: { background?: boolean } = {}
): () => void {
  return native().addPositionListener(onPosition, (code, message) => {
    onError(Object.assign(new Error(message), { code }))
  }, options.background === true)
}

function geocodeAddress(address: string): Promise<LocationPlace[]> {
  return native().geocodeAddress(address).catch(rethrowNativeError)
}

function reverseGeocode(latitude: number, longitude: number): Promise<LocationPlace[]> {
  return native().reverseGeocode(latitude, longitude).catch(rethrowNativeError)
}

export const Location = Object.freeze({
  getPermissionStatus,
  requestWhenInUsePermission,
  getCurrentPosition,
  watchPosition,
  geocodeAddress,
  reverseGeocode,
})
