import { missingNativeBuild } from '../nativeError'
import type {
  LocationPermissionStatus,
  LocationPosition,
  LocationPlace,
  LocationRegion,
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
export type LocationWatchError = Error & { code: string }
export interface RegionSubscription {
  remove(): void
}

export const Location = Object.freeze({
  getPermissionStatus: (): LocationPermissionStatus => 'denied',
  requestWhenInUsePermission: (): Promise<LocationPermissionStatus> =>
    Promise.resolve('denied'),
  requestAlwaysAuthorization: (): Promise<LocationPermissionStatus> =>
    Promise.resolve('denied'),
  getCurrentPosition: (): Promise<LocationPosition> =>
    Promise.reject(missingNativeBuild('Location.getCurrentPosition')),
  watchPosition:
    (
      _onPosition: (position: LocationPosition) => void,
      _onError: (error: LocationWatchError) => void,
      _options: { background?: boolean } = {}
    ): (() => void) =>
    () => {},
  geocodeAddress: (_address: string): Promise<LocationPlace[]> => Promise.resolve([]),
  reverseGeocode: (_latitude: number, _longitude: number): Promise<LocationPlace[]> =>
    Promise.resolve([]),
  startMonitoring: (region: LocationRegion): Promise<void> => {
    assertRegion(region, 'startMonitoring')
    return Promise.resolve()
  },
  stopMonitoring: (identifier: string): Promise<void> => {
    assertIdentifier(identifier, 'stopMonitoring')
    return Promise.resolve()
  },
  monitoredRegions: (): LocationRegion[] => [],
  requestState: (identifier: string): Promise<RegionState> => {
    assertIdentifier(identifier, 'requestState')
    return Promise.resolve('unknown')
  },
  addDidEnterRegionListener: (
    listener: (region: LocationRegion) => void
  ): RegionSubscription => {
    assertRegionListener(listener, 'addDidEnterRegionListener')
    return { remove: () => {} }
  },
  addDidExitRegionListener: (
    listener: (region: LocationRegion) => void
  ): RegionSubscription => {
    assertRegionListener(listener, 'addDidExitRegionListener')
    return { remove: () => {} }
  },
})
