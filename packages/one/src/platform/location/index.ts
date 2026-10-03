import type {
  LocationPermissionStatus,
  LocationPosition,
  LocationPlace,
} from '../specs/OneLocation.nitro'

export type { LocationPermissionStatus, LocationPosition, LocationPlace }
export type LocationWatchError = Error & { code: string }

function unavailable(): never {
  throw new Error('Location requires an iOS native build')
}

export const Location = Object.freeze({
  getPermissionStatus: (): LocationPermissionStatus => unavailable(),
  requestWhenInUsePermission: (): Promise<LocationPermissionStatus> => unavailable(),
  getCurrentPosition: (): Promise<LocationPosition> => unavailable(),
  watchPosition: (
    _onPosition: (position: LocationPosition) => void,
    _onError: (error: LocationWatchError) => void,
    _options: { background?: boolean } = {}
  ): (() => void) => unavailable(),
  geocodeAddress: (_address: string): Promise<LocationPlace[]> => unavailable(),
  reverseGeocode: (_latitude: number, _longitude: number): Promise<LocationPlace[]> =>
    unavailable(),
})
