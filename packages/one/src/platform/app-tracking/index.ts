import type { AppTrackingPermissionStatus } from '../specs/OneAppTracking.nitro'

export type { AppTrackingPermissionStatus } from '../specs/OneAppTracking.nitro'

const unsupported = (): never => {
  throw new Error('AppTracking requires an iOS native build')
}

export const AppTracking = Object.freeze({
  getPermissionStatus: (): AppTrackingPermissionStatus => unsupported(),
  requestPermission: (): Promise<AppTrackingPermissionStatus> => unsupported(),
})
