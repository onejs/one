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
import { DEFAULT_ACTION_IDENTIFIER, toNativeImportance } from './types'

export type * from './types'

// web behavior: permission reads resolve denied, lists are empty, listeners
// are inert, and schedule rejects. input checks match native exactly.
const denied: NotificationPermissionResponse = {
  status: 'denied',
  granted: false,
  canAskAgain: false,
}

async function getPermissions(): Promise<NotificationPermissionResponse> {
  return { ...denied }
}

async function requestPermissions(
  _options: NotificationPermissionRequest = {}
): Promise<NotificationPermissionResponse> {
  return { ...denied }
}

async function getBadgeCount(): Promise<number> {
  return 0
}

async function setBadgeCount(_count: number): Promise<boolean> {
  return false
}

async function setChannel(
  _channelId: string,
  channel: NotificationChannelInput
): Promise<NotificationChannel | null> {
  toNativeImportance(channel.importance)
  return null
}

async function getChannel(_channelId: string): Promise<NotificationChannel | null> {
  return null
}

async function getChannels(): Promise<NotificationChannel[]> {
  return []
}

async function deleteChannel(_channelId: string): Promise<void> {}

const inert: NotificationSubscription = { remove: () => {} }

function addReceivedListener(
  _listener: (notification: Notification) => void
): NotificationSubscription {
  return inert
}

function addResponseReceivedListener(
  _listener: (response: NotificationResponse) => void
): NotificationSubscription {
  return inert
}

function setHandler(_handler: NotificationHandlerInput | null): void {}

function getLastResponse(): NotificationResponse | null {
  return null
}

function clearLastResponse(): void {}

async function schedule(_request: NotificationScheduleInput): Promise<string> {
  throw new Error('Notifications.schedule needs an iOS or Android build')
}

async function cancelScheduled(_identifier: string): Promise<void> {}

async function cancelAllScheduled(): Promise<void> {}

async function getAllScheduled(): Promise<ScheduledNotification[]> {
  return []
}

async function getPresented(): Promise<Notification[]> {
  return []
}

async function dismiss(_identifier: string): Promise<void> {}

async function dismissAll(): Promise<void> {}

export const Notifications = Object.freeze({
  getPermissions,
  requestPermissions,
  getBadgeCount,
  setBadgeCount,
  setChannel,
  getChannel,
  getChannels,
  deleteChannel,
  addReceivedListener,
  addResponseReceivedListener,
  setHandler,
  getLastResponse,
  clearLastResponse,
  schedule,
  cancelScheduled,
  cancelAllScheduled,
  getAllScheduled,
  getPresented,
  dismiss,
  dismissAll,
  DEFAULT_ACTION_IDENTIFIER,
})
