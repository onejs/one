import type {
  NotificationChannel,
  NotificationChannelInput,
  NotificationPermissionRequest,
  NotificationPermissionResponse,
} from './types'

export type * from './types'
export { AndroidImportance } from './types'

// web behavior: permission reads resolve denied, everything else is inert.
// browser push is out of scope.
const denied: NotificationPermissionResponse = {
  status: 'denied',
  granted: false,
  canAskAgain: false,
}

export async function getPermissionsAsync(): Promise<NotificationPermissionResponse> {
  return { ...denied }
}

export async function requestPermissionsAsync(
  _options: NotificationPermissionRequest = {}
): Promise<NotificationPermissionResponse> {
  return { ...denied }
}

export async function getBadgeCountAsync(): Promise<number> {
  return 0
}

export async function setBadgeCountAsync(_count: number): Promise<boolean> {
  return false
}

export async function setNotificationChannelAsync(
  _channelId: string,
  _channel: NotificationChannelInput
): Promise<NotificationChannel | null> {
  return null
}

export async function getNotificationChannelAsync(
  _channelId: string
): Promise<NotificationChannel | null> {
  return null
}

export async function getNotificationChannelsAsync(): Promise<NotificationChannel[]> {
  return []
}

export async function deleteNotificationChannelAsync(_channelId: string): Promise<void> {}
