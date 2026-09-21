import { NativeEventEmitter, Platform, TurboModuleRegistry } from 'react-native'

import type { Spec as NotificationsSpec } from '../specs/OneNativeNotificationsNativeModule'
import { ForegroundHandler } from './handlerState'
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

// one native subscription per event, fanned out to js listeners, plus the
// foreground runner that answers native's presentation round trip.
const receivedListeners = new Set<(notification: Notification) => void>()
const responseListeners = new Set<(response: NotificationResponse) => void>()
let sharedEmitter: NativeEventEmitter | null = null
let sharedRunner: ForegroundHandler | null = null

function events(): { emitter: NativeEventEmitter; runner: ForegroundHandler } {
  if (!sharedEmitter || !sharedRunner) {
    const module = native()
    const runner = new ForegroundHandler((requestId, behavior) => {
      // native drops unknown ids and shows everything after 3s on its own,
      // so a rejection here only means the bridge is gone.
      module.presentNotification(requestId, behavior).catch(() => {})
    })
    const emitter = new NativeEventEmitter(module)
    emitter.addListener(
      'oneNativeNotificationsReceived',
      (event: { requestId: string; notification: Notification }) => {
        if (!runner.receive(event.requestId, event.notification)) return
        receivedListeners.forEach((listener) => listener(event.notification))
      }
    )
    emitter.addListener('oneNativeNotificationsResponse', (response: NotificationResponse) => {
      responseListeners.forEach((listener) => listener(response))
    })
    sharedEmitter = emitter
    sharedRunner = runner
  }
  return { emitter: sharedEmitter, runner: sharedRunner }
}

function subscribe<T>(
  listeners: Set<(value: T) => void>,
  listener: (value: T) => void
): NotificationSubscription {
  events()
  listeners.add(listener)
  return {
    remove: () => {
      listeners.delete(listener)
    },
  }
}

// fire when a notification arrives while the app runs in the foreground.
export function addNotificationReceivedListener(
  listener: (notification: Notification) => void
): NotificationSubscription {
  return subscribe(receivedListeners, listener)
}

// fire when the user taps a notification while the app runs. a tap that
// cold-starts the app surfaces through getLastNotificationResponse instead.
export function addNotificationResponseReceivedListener(
  listener: (response: NotificationResponse) => void
): NotificationSubscription {
  return subscribe(responseListeners, listener)
}

// decide how an arriving foreground notification presents. until the app
// sets a handler the notification shows fully, like expo. setting null
// leaves native undecided, which hides it on both platforms.
export function setNotificationHandler(handler: NotificationHandlerInput | null): void {
  events().runner.setHandler(handler)
}

// the response that last tapped the app awake, if any. synchronous, like expo.
export function getLastNotificationResponse(): NotificationResponse | null {
  return native().getLastNotificationResponse()
}

export function clearLastNotificationResponse(): void {
  native().clearLastNotificationResponse()
}

// schedule a local notification. trigger null delivers immediately,
// a timeInterval waits seconds, a date fires at the timestamp. a past date
// delivers immediately on both platforms.
export async function scheduleNotificationAsync(
  request: NotificationScheduleInput
): Promise<string> {
  const trigger = request.trigger
  if (
    trigger !== null &&
    typeof trigger === 'object' &&
    trigger.type === 'date' &&
    trigger.date instanceof Date
  ) {
    return native().scheduleNotification({
      ...request,
      trigger: { ...trigger, date: trigger.date.getTime() },
    })
  }
  return native().scheduleNotification(request)
}

export async function cancelScheduledNotificationAsync(identifier: string): Promise<void> {
  return native().cancelScheduledNotification(identifier)
}

export async function cancelAllScheduledNotificationsAsync(): Promise<void> {
  return native().cancelAllScheduledNotifications()
}

export async function getAllScheduledNotificationsAsync(): Promise<ScheduledNotification[]> {
  return native().getAllScheduledNotifications()
}

export async function getPresentedNotificationsAsync(): Promise<Notification[]> {
  return native().getPresentedNotifications()
}

export async function dismissNotificationAsync(identifier: string): Promise<void> {
  return native().dismissNotification(identifier)
}

export async function dismissAllNotificationsAsync(): Promise<void> {
  return native().dismissAllNotifications()
}
