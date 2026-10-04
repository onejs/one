import { missingNativeBuild } from '../nativeError'
import type {
  LocationPermissionStatus,
  LocationPosition,
  LocationPlace,
} from '../specs/OneLocation.nitro'

export type { LocationPermissionStatus, LocationPosition, LocationPlace }
export type LocationWatchError = Error & { code: string }

export const Location = Object.freeze({
  getPermissionStatus: (): LocationPermissionStatus => 'denied',
  requestWhenInUsePermission: (): Promise<LocationPermissionStatus> => Promise.resolve('denied'),
  getCurrentPosition: (): Promise<LocationPosition> => Promise.reject(missingNativeBuild('Location.getCurrentPosition')),
  watchPosition: (
    _onPosition: (position: LocationPosition) => void,
    _onError: (error: LocationWatchError) => void,
    _options: { background?: boolean } = {}
  ): (() => void) => () => {},
  geocodeAddress: (_address: string): Promise<LocationPlace[]> => Promise.resolve([]),
  reverseGeocode: (_latitude: number, _longitude: number): Promise<LocationPlace[]> =>
    Promise.resolve([]),
})
