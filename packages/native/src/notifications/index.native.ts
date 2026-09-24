import { NativeEventEmitter, Platform, TurboModuleRegistry } from 'react-native'

import type {
  NativeChannel,
  NativePermissionResponse,
  Spec as NotificationsSpec,
} from '../specs/OneNativeNotificationsNativeModule'
import { ForegroundHandler } from './handlerState'
import type {
  DevicePushToken,
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
import {
  DEFAULT_ACTION_IDENTIFIER,
  fromNativeAuthorizationStatus,
  fromNativeImportance,
  toNativeImportance,
} from './types'

export type * from './types'

// the native module is resolved once and lazily. null until the app links
// @vxrn/native; every method below degrades to its web behavior then,
// instead of throwing.
let cached: NotificationsSpec | null | undefined

function native(): NotificationsSpec | null {
  if (cached === undefined) {
    cached = TurboModuleRegistry.get<NotificationsSpec>('OneNativeNotifications')
  }
  return cached
}

const denied: NotificationPermissionResponse = {
  status: 'denied',
  granted: false,
  canAskAgain: false,
}

function mapPermissionResponse(
  response: NativePermissionResponse | null | undefined
): NotificationPermissionResponse {
  if (!response) return { ...denied }
  return {
    status: response.status,
    granted: response.granted,
    canAskAgain: response.canAskAgain,
    ...(response.ios
      ? { ios: { status: fromNativeAuthorizationStatus(response.ios.status) } }
      : {}),
  }
}

// the current notification authorization, without prompting.
async function getPermissions(): Promise<NotificationPermissionResponse> {
  const module = native()
  if (!module) return { ...denied }
  return mapPermissionResponse(await module.getPermissions())
}

// prompt for notification authorization. on android below 13 there is no
// runtime prompt, so this resolves the current status instead.
async function requestPermissions(
  options: NotificationPermissionRequest = {}
): Promise<NotificationPermissionResponse> {
  const module = native()
  if (!module) return { ...denied }
  return mapPermissionResponse(await module.requestPermissions(options))
}

// the app icon badge count. always 0 on android.
async function getBadgeCount(): Promise<number> {
  return (await native()?.getBadgeCount()) ?? 0
}

// set the app icon badge count. resolves false on android: the launcher
// owns badges there.
async function setBadgeCount(count: number): Promise<boolean> {
  return (await native()?.setBadgeCount(count)) ?? false
}

function mapChannel(channel: NativeChannel): NotificationChannel {
  return {
    id: channel.id,
    name: channel.name,
    importance: fromNativeImportance(channel.importance),
    description: channel.description,
    sound: channel.sound,
    vibrationPattern: channel.vibrationPattern,
    showBadge: channel.showBadge,
  }
}

// create an android notification channel. settings apply on first create;
// afterwards the user owns them in system settings. resolves null on ios,
// which has no channels.
async function setChannel(
  channelId: string,
  channel: NotificationChannelInput
): Promise<NotificationChannel | null> {
  const importance = toNativeImportance(channel.importance)
  if (Platform.OS !== 'android') return null
  const created = await native()?.setNotificationChannel(channelId, {
    ...channel,
    importance,
  })
  return created ? mapChannel(created) : null
}

async function getChannel(channelId: string): Promise<NotificationChannel | null> {
  if (Platform.OS !== 'android') return null
  const found = await native()?.getNotificationChannel(channelId)
  return found ? mapChannel(found) : null
}

async function getChannels(): Promise<NotificationChannel[]> {
  if (Platform.OS !== 'android') return []
  const channels = await native()?.getNotificationChannels()
  return channels ? channels.map(mapChannel) : []
}

async function deleteChannel(channelId: string): Promise<void> {
  if (Platform.OS !== 'android') return
  await native()?.deleteNotificationChannel(channelId)
}

// one native subscription per event, fanned out to js listeners, plus the
// foreground runner that answers native's presentation round trip.
const receivedListeners = new Set<(notification: Notification) => void>()
const responseListeners = new Set<(response: NotificationResponse) => void>()
const pushTokenListeners = new Set<(token: DevicePushToken) => void>()
let sharedEmitter: NativeEventEmitter | null = null
let sharedRunner: ForegroundHandler | null = null

function events(module: NotificationsSpec): {
  emitter: NativeEventEmitter
  runner: ForegroundHandler
} {
  if (!sharedEmitter || !sharedRunner) {
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
    emitter.addListener(
      'oneNativeNotificationsResponse',
      (response: NotificationResponse) => {
        responseListeners.forEach((listener) => listener(response))
      }
    )
    emitter.addListener('oneNativeNotificationsPushToken', (token: DevicePushToken) => {
      pushTokenListeners.forEach((listener) => listener(token))
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
  const module = native()
  if (!module) return { remove: () => {} }
  events(module)
  listeners.add(listener)
  return {
    remove: () => {
      listeners.delete(listener)
    },
  }
}

// fire when a notification arrives while the app runs in the foreground.
function addReceivedListener(
  listener: (notification: Notification) => void
): NotificationSubscription {
  return subscribe(receivedListeners, listener)
}

// fire when the user taps a notification while the app runs. a tap that
// cold-starts the app surfaces through getLastResponse instead.
function addResponseReceivedListener(
  listener: (response: NotificationResponse) => void
): NotificationSubscription {
  return subscribe(responseListeners, listener)
}

// the remote push token: the apns hex token on ios, the fcm registration
// token on android. rejects without an ios or android build, when push is
// not enabled, and when the platform returns no token.
async function getDevicePushTokenAsync(): Promise<DevicePushToken> {
  const module = native()
  if (!module)
    throw new Error('Notifications.getDevicePushTokenAsync needs an iOS or Android build')
  const token = await module.getDevicePushToken()
  const type =
    token && (token.type === 'ios' || token.type === 'android') ? token.type : null
  if (!token || type === null || typeof token.data !== 'string' || !token.data.length) {
    throw new Error('Notifications.getDevicePushTokenAsync did not return a push token')
  }
  return { type, data: token.data }
}

// fire when the push token refreshes. registering does not fire: read the
// current token with getDevicePushTokenAsync.
function addPushTokenListener(
  listener: (token: DevicePushToken) => void
): NotificationSubscription {
  return subscribe(pushTokenListeners, listener)
}

// decide how an arriving foreground notification presents. until the app
// sets a handler the notification shows fully, like expo. setting null
// leaves native undecided, which hides it on both platforms.
function setHandler(handler: NotificationHandlerInput | null): void {
  const module = native()
  if (!module) return
  events(module).runner.setHandler(handler)
}

// the response that last tapped the app awake, if any. synchronous, like expo.
function getLastResponse(): NotificationResponse | null {
  return native()?.getLastNotificationResponse() ?? null
}

function clearLastResponse(): void {
  native()?.clearLastNotificationResponse()
}

// schedule a local notification. trigger null delivers immediately,
// a timeInterval waits seconds, a date fires at the timestamp. a past date
// delivers immediately on both platforms.
async function schedule(request: NotificationScheduleInput): Promise<string> {
  const module = native()
  if (!module) throw new Error('Notifications.schedule needs an iOS or Android build')
  const trigger = request.trigger
  if (
    trigger !== null &&
    typeof trigger === 'object' &&
    trigger.type === 'date' &&
    trigger.date instanceof Date
  ) {
    return module.scheduleNotification({
      ...request,
      trigger: { ...trigger, date: trigger.date.getTime() },
    })
  }
  return module.scheduleNotification(request)
}

async function cancelScheduled(identifier: string): Promise<void> {
  await native()?.cancelScheduledNotification(identifier)
}

async function cancelAllScheduled(): Promise<void> {
  await native()?.cancelAllScheduledNotifications()
}

async function getAllScheduled(): Promise<ScheduledNotification[]> {
  return (await native()?.getAllScheduledNotifications()) ?? []
}

async function getPresented(): Promise<Notification[]> {
  return (await native()?.getPresentedNotifications()) ?? []
}

async function dismiss(identifier: string): Promise<void> {
  await native()?.dismissNotification(identifier)
}

async function dismissAll(): Promise<void> {
  await native()?.dismissAllNotifications()
}

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
  getDevicePushTokenAsync,
  addPushTokenListener,
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
