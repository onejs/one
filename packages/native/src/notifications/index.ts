import type {
  Notification,
  NotificationChannel,
  NotificationChannelInput,
  NotificationHandlerInput,
  NotificationPermissionRequest,
  NotificationPermissionResponse,
  NotificationResponse,
  NotificationScheduleInput,
  NotificationSubscription,
  ScheduledNotification,
} from './types'

export type * from './types'
export { AndroidImportance, DEFAULT_ACTION_IDENTIFIER } from './types'

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

const inert: NotificationSubscription = { remove: () => {} }

export function addNotificationReceivedListener(
  _listener: (notification: Notification) => void
): NotificationSubscription {
  return inert
}

export function addNotificationResponseReceivedListener(
  _listener: (response: NotificationResponse) => void
): NotificationSubscription {
  return inert
}

export function setNotificationHandler(_handler: NotificationHandlerInput | null): void {}

export function getLastNotificationResponse(): NotificationResponse | null {
  return null
}

export function clearLastNotificationResponse(): void {}

export async function scheduleNotificationAsync(
  _request: NotificationScheduleInput
): Promise<string> {
  throw new Error('Notifications.schedule needs an iOS or Android build')
}

export async function cancelScheduledNotificationAsync(
  _identifier: string
): Promise<void> {}

export async function cancelAllScheduledNotificationsAsync(): Promise<void> {}

export async function getAllScheduledNotificationsAsync(): Promise<
  ScheduledNotification[]
> {
  return []
}

export async function getPresentedNotificationsAsync(): Promise<Notification[]> {
  return []
}

export async function dismissNotificationAsync(_identifier: string): Promise<void> {}

export async function dismissAllNotificationsAsync(): Promise<void> {}
