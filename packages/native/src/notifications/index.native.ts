import { TurboModuleRegistry } from 'react-native'

import type { Spec as NotificationsSpec } from '../specs/OneNativeNotificationsNativeModule'
import type {
  NotificationPermissionRequest,
  NotificationPermissionResponse,
} from './types'

export type * from './types'

// the native module is resolved once and lazily. null until the app links
// @vxrn/native, exactly like the other native modules in this package.
let cached: NotificationsSpec | null | undefined

function native(): NotificationsSpec {
  if (cached === undefined) {
    cached = TurboModuleRegistry.get<NotificationsSpec>('OneNativeNotifications')
  }
  if (!cached) {
    throw new Error(
      'OneNativeNotifications is not installed: rebuild the native app with @vxrn/native linked'
    )
  }
  return cached
}

// the current notification authorization, without prompting.
export async function getPermissionsAsync(): Promise<NotificationPermissionResponse> {
  return native().getPermissions()
}

// prompt for notification authorization. on android below 13 there is no
// runtime prompt, so this resolves the current status instead.
export async function requestPermissionsAsync(
  options: NotificationPermissionRequest = {}
): Promise<NotificationPermissionResponse> {
  return native().requestPermissions(options)
}

// the app icon badge count. always 0 on android.
export async function getBadgeCountAsync(): Promise<number> {
  return native().getBadgeCount()
}

// set the app icon badge count. resolves false on android: the launcher
// owns badges there.
export async function setBadgeCountAsync(count: number): Promise<boolean> {
  return native().setBadgeCount(count)
}
