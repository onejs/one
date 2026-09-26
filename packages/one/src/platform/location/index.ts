import type {
  LocationPermissionStatus,
  LocationPosition,
} from '../specs/OneLocation.nitro'

export type { LocationPermissionStatus, LocationPosition }

function unavailable(): never {
  throw new Error('Location requires an iOS native build')
}

export const Location = Object.freeze({
  getPermissionStatus: (): LocationPermissionStatus => unavailable(),
  requestWhenInUsePermission: (): Promise<LocationPermissionStatus> => unavailable(),
  getCurrentPosition: (): Promise<LocationPosition> => unavailable(),
})
