import { ATTrackingManager } from 'one/ios/AppTrackingTransparency'
import { Bundle } from 'one/ios/Foundation'
import { UIApplication } from 'one/ios/UIKit'
import type { AppTrackingPermissionStatus } from '../specs/OneAppTracking.nitro'

let pending: Promise<AppTrackingPermissionStatus> | undefined

function status(): AppTrackingPermissionStatus {
  const value = ATTrackingManager.trackingAuthorizationStatus
  return value
}

async function request(): Promise<AppTrackingPermissionStatus> {
  const usage = Bundle.main.object('NSUserTrackingUsageDescription')
  if (typeof usage !== 'string' || !usage.trim()) {
    throw Object.assign(new Error('AppTracking.requestPermission: set ios.infoPlist.NSUserTrackingUsageDescription'), {
      code: 'E_APP_TRACKING_MANIFEST',
    })
  }
  const current = status()
  if (current !== 'notDetermined') return current
  if ((await (await UIApplication.shared).applicationState) !== 'active') {
    throw Object.assign(new Error('AppTracking.requestPermission: request while the app is active'), {
      code: 'E_APP_TRACKING_INACTIVE',
    })
  }
  return new Promise((resolve) => {
    ATTrackingManager.requestTrackingAuthorization((value) => {
      resolve(value)
    })
  })
}

const backend = {
  getPermissionStatus: status,
  requestPermission() {
    return (pending ??= request().finally(() => { pending = undefined }))
  },
}

export function appTrackingNative() {
  return backend
}
