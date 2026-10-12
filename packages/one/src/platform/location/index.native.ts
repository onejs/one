import { NitroModules } from 'react-native-nitro-modules'
import { rethrowNativeError } from '../nativeError'
import type {
  LocationPermissionStatus,
  LocationPosition,
  LocationPlace,
  LocationRegion,
  OneLocation,
  RegionCenter,
  RegionState,
} from '../specs/OneLocation.nitro'
import { assertIdentifier, assertRegion, assertRegionListener } from './validation'

export type {
  LocationPermissionStatus,
  LocationPosition,
  LocationPlace,
  LocationRegion,
  RegionCenter,
  RegionState,
}

let hybrid: OneLocation | undefined

function native(): OneLocation {
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

function requestAlwaysAuthorization(): Promise<LocationPermissionStatus> {
  return native().requestAlwaysAuthorization().catch(rethrowNativeError)
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

export interface RegionSubscription {
  remove(): void
}

function startMonitoring(region: LocationRegion): Promise<void> {
  assertRegion(region, 'startMonitoring')
  return native().startMonitoring(region).catch(rethrowNativeError)
}

function stopMonitoring(identifier: string): Promise<void> {
  assertIdentifier(identifier, 'stopMonitoring')
  return native().stopMonitoring(identifier).catch(rethrowNativeError)
}

function monitoredRegions(): LocationRegion[] {
  try {
    return native().monitoredRegions()
  } catch (error) {
    return rethrowNativeError(error)
  }
}

function requestState(identifier: string): Promise<RegionState> {
  assertIdentifier(identifier, 'requestState')
  return native().requestState(identifier).catch(rethrowNativeError)
}

function addDidEnterRegionListener(
  listener: (region: LocationRegion) => void
): RegionSubscription {
  assertRegionListener(listener, 'addDidEnterRegionListener')
  const remove = native().addDidEnterRegionListener(listener)
  return { remove: () => remove() }
}

function addDidExitRegionListener(
  listener: (region: LocationRegion) => void
): RegionSubscription {
  assertRegionListener(listener, 'addDidExitRegionListener')
  const remove = native().addDidExitRegionListener(listener)
  return { remove: () => remove() }
}

export const Location = Object.freeze({
  getPermissionStatus,
  requestWhenInUsePermission,
  requestAlwaysAuthorization,
  getCurrentPosition,
  watchPosition,
  geocodeAddress,
  reverseGeocode,
  startMonitoring,
  stopMonitoring,
  monitoredRegions,
  requestState,
  addDidEnterRegionListener,
  addDidExitRegionListener,
})
