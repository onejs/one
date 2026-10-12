import type { AppTrackingPermissionStatus } from '../specs/OneAppTracking.nitro'

export type { AppTrackingPermissionStatus } from '../specs/OneAppTracking.nitro'

export const AppTracking = Object.freeze({
  getPermissionStatus: (): AppTrackingPermissionStatus => 'denied',
  requestPermission: (): Promise<AppTrackingPermissionStatus> =>
    Promise.resolve('denied'),
})
