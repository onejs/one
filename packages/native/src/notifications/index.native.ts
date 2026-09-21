import { Platform, TurboModuleRegistry } from 'react-native'

import type { Spec as NotificationsSpec } from '../specs/OneNativeNotificationsNativeModule'
import type {
  NotificationChannel,
  NotificationChannelInput,
  NotificationPermissionRequest,
  NotificationPermissionResponse,
} from './types'

export type * from './types'
export { AndroidImportance } from './types'

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

// create or update an android notification channel. settings apply on first
// create; afterwards the user owns them in system settings. resolves null
// on ios, which has no channels.
export async function setNotificationChannelAsync(
  channelId: string,
  channel: NotificationChannelInput
): Promise<NotificationChannel | null> {
  if (Platform.OS !== 'android') return null
  return native().setNotificationChannel(channelId, channel)
}

export async function getNotificationChannelAsync(
  channelId: string
): Promise<NotificationChannel | null> {
  if (Platform.OS !== 'android') return null
  return native().getNotificationChannel(channelId)
}

export async function getNotificationChannelsAsync(): Promise<NotificationChannel[]> {
  if (Platform.OS !== 'android') return []
  return native().getNotificationChannels()
}

export async function deleteNotificationChannelAsync(channelId: string): Promise<void> {
  if (Platform.OS !== 'android') return
  return native().deleteNotificationChannel(channelId)
}
