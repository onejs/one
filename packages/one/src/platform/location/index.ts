import { Location as unavailable } from './unavailable'
import { validateCallback } from '../validateCallback'
import type {
  LocationPermissionStatus,
  LocationPosition,
  LocationPlace,
} from '../specs/OneLocation.nitro'
export type { LocationPermissionStatus, LocationPosition, LocationPlace }
export type LocationWatchError = Error & { code: string }
let permission: LocationPermissionStatus = 'notDetermined'
let observing: Promise<void> | undefined
function observe(): Promise<void> {
  return (observing ??= (async () => {
    if (!navigator.permissions) return
    try {
      const status = await navigator.permissions.query({ name: 'geolocation' })
      const update = () => {
        permission =
          status.state === 'granted'
            ? 'whenInUse'
            : status.state === 'denied'
              ? 'denied'
              : 'notDetermined'
      }
      update()
      status.addEventListener('change', update)
    } catch {
      /* permission queries are not supported by every browser. */
    }
  })())
}
function position(value: GeolocationPosition): LocationPosition {
  permission = 'whenInUse'
  const c = value.coords
  return {
    latitude: c.latitude,
    longitude: c.longitude,
    accuracy: c.accuracy,
    altitude: c.altitude ?? 0,
    altitudeAccuracy: c.altitudeAccuracy ?? -1,
    course: c.heading ?? -1,
    speed: c.speed ?? -1,
    timestamp: value.timestamp,
  }
}
function failure(error: GeolocationPositionError): LocationWatchError {
  if (error.code === 1) permission = 'denied'
  return Object.assign(new Error(error.message), {
    code: error.code === 1 ? 'E_LOCATION_PERMISSION' : 'E_LOCATION_UNAVAILABLE',
  })
}
async function current(): Promise<LocationPosition> {
  if (typeof window === 'undefined' || !navigator.geolocation)
    return unavailable.getCurrentPosition()
  await observe()
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(
      (value) => resolve(position(value)),
      (error) => reject(failure(error)),
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 10_000 }
    )
  )
}
export const Location = Object.freeze({
  getPermissionStatus: (): LocationPermissionStatus => {
    if (typeof window === 'undefined' || !navigator.geolocation) return 'denied'
    void observe()
    return permission
  },
  requestWhenInUsePermission: async (): Promise<LocationPermissionStatus> => {
    if (typeof window === 'undefined' || !navigator.geolocation) return 'denied'
    try {
      await current()
    } catch (error) {
      if ((error as LocationWatchError).code !== 'E_LOCATION_PERMISSION') throw error
    }
    return permission
  },
  getCurrentPosition: current,
  watchPosition: (
    onPosition: (value: LocationPosition) => void,
    onError: (error: LocationWatchError) => void,
    options: { background?: boolean } = {}
  ): (() => void) => {
    if (typeof window === 'undefined')
      return unavailable.watchPosition(onPosition, onError, options)
    validateCallback(onPosition, 'Location.watchPosition: onPosition must be a function')
    validateCallback(onError, 'Location.watchPosition: onError must be a function')
    if (options.background || !navigator.geolocation) {
      onError(
        Object.assign(
          new Error('Location.watchPosition: background location is unavailable on web'),
          { code: 'E_LOCATION_UNAVAILABLE' }
        )
      )
      return () => {}
    }
    void observe()
    let active = true
    const id = navigator.geolocation.watchPosition(
      (value) => {
        if (active) onPosition(position(value))
      },
      (error) => {
        if (active) onError(failure(error))
      },
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 10_000 }
    )
    return () => {
      active = false
      navigator.geolocation.clearWatch(id)
    }
  },
  geocodeAddress: unavailable.geocodeAddress,
  reverseGeocode: unavailable.reverseGeocode,
})
