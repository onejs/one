import { Platform } from 'react-native'
import { type AnyMap, NitroModules, type ValueType } from 'react-native-nitro-modules'

import { rethrowNativeError } from '../nativeError'
import type {
  NativeChannel,
  NativeContent,
  NativeNotification,
  NativeNotificationRequest,
  NativeNotificationResponse,
  NativePermissionResponse,
  NativeTrigger,
  OneNotifications,
} from '../specs/OneNotifications.nitro'
import { ForegroundHandler } from './handlerState'
import type {
  DevicePushToken,
  Notification,
  NotificationChannel,
  NotificationChannelInput,
  NotificationContent,
  NotificationHandlerInput,
  NotificationPermissionRequest,
  NotificationPermissionResponse,
  NotificationRequest,
  NotificationResponse,
  NotificationScheduleInput,
  NotificationSubscription,
  NotificationTrigger,
  ScheduledNotification,
} from './types'
import {
  DEFAULT_ACTION_IDENTIFIER,
  fromNativeAuthorizationStatus,
  fromNativeImportance,
  toNativeImportance,
} from './types'

export type * from './types'

// the OneNotifications nitro hybrid object is created once and lazily. null
// outside a native build; every method below degrades to its web
// behavior then, instead of throwing.
let cached: OneNotifications | null | undefined

function native(): OneNotifications | null {
  if (cached === undefined) {
    cached = NitroModules.hasHybridObject('OneNotifications')
      ? NitroModules.createHybridObject<OneNotifications>('OneNotifications')
      : null
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
  return mapPermissionResponse(await module.getPermissions().catch(rethrowNativeError))
}

// prompt for notification authorization. on android below 13 there is no
// runtime prompt, so this resolves the current status instead.
async function requestPermissions(
  options: NotificationPermissionRequest = {}
): Promise<NotificationPermissionResponse> {
  const module = native()
  if (!module) return { ...denied }
  return mapPermissionResponse(
    await module.requestPermissions(options).catch(rethrowNativeError)
  )
}

// the app icon badge count. always 0 on android.
async function getBadgeCount(): Promise<number> {
  return (await native()?.getBadgeCount().catch(rethrowNativeError)) ?? 0
}

// set the app icon badge count. resolves false on android: the launcher
// owns badges there.
async function setBadgeCount(count: number): Promise<boolean> {
  return (await native()?.setBadgeCount(count).catch(rethrowNativeError)) ?? false
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
  const created = await native()
    ?.setNotificationChannel(channelId, { ...channel, importance })
    .catch(rethrowNativeError)
  return created ? mapChannel(created) : null
}

async function getChannel(channelId: string): Promise<NotificationChannel | null> {
  if (Platform.OS !== 'android') return null
  const found = await native()
    ?.getNotificationChannel(channelId)
    .catch(rethrowNativeError)
  return found ? mapChannel(found) : null
}

async function getChannels(): Promise<NotificationChannel[]> {
  if (Platform.OS !== 'android') return []
  const channels = await native()?.getNotificationChannels().catch(rethrowNativeError)
  return channels ? channels.map(mapChannel) : []
}

async function deleteChannel(channelId: string): Promise<void> {
  if (Platform.OS !== 'android') return
  await native()?.deleteNotificationChannel(channelId).catch(rethrowNativeError)
}

// native flattens nulls to absent fields and trigger variants to one
// struct; these restore the public shapes.
function mapTrigger(trigger: NativeTrigger): NotificationTrigger {
  switch (trigger.type) {
    case 'timeInterval':
      return {
        type: 'timeInterval',
        seconds: trigger.seconds ?? 0,
        repeats: trigger.repeats ?? false,
      }
    case 'date':
      return { type: 'date', date: trigger.date ?? 0 }
    case 'push':
      return { type: 'push' }
    default:
      return { type: 'unknown' }
  }
}

function mapContent(content: NativeContent): NotificationContent {
  return {
    title: content.title ?? null,
    subtitle: content.subtitle ?? null,
    body: content.body ?? null,
    data: content.data,
    sound: content.sound,
    badge: content.badge ?? null,
  }
}

function mapRequest(request: NativeNotificationRequest): NotificationRequest {
  return {
    identifier: request.identifier,
    content: mapContent(request.content),
    trigger: mapTrigger(request.trigger),
  }
}

function mapNotification(notification: NativeNotification): Notification {
  return { request: mapRequest(notification.request), date: notification.date }
}

function mapResponse(response: NativeNotificationResponse): NotificationResponse {
  return {
    notification: mapNotification(response.notification),
    actionIdentifier: response.actionIdentifier,
  }
}

// content data crosses nitro as an AnyMap: json values only. undefined and
// other non-json entries drop, as the bridge serializer did.
function toValue(value: unknown): ValueType | undefined {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value
  }
  if (Array.isArray(value)) return value.map((item) => toValue(item) ?? null)
  if (typeof value === 'object') return toAnyMap(Object.entries(value))
  return undefined
}

function toAnyMap(entries: [string, unknown][]): AnyMap {
  const map: AnyMap = {}
  for (const [key, item] of entries) {
    const value = toValue(item)
    if (value !== undefined) map[key] = value
  }
  return map
}

// one native listener set, fanned out to js listeners, plus the foreground
// runner that answers native's presentation round trip.
const receivedListeners = new Set<(notification: Notification) => void>()
const responseListeners = new Set<(response: NotificationResponse) => void>()
const pushTokenListeners = new Set<(token: DevicePushToken) => void>()
let sharedRunner: ForegroundHandler | null = null

function events(module: OneNotifications): ForegroundHandler {
  if (!sharedRunner) {
    // native drops unknown ids and shows everything after 3s on its own.
    const runner = new ForegroundHandler((requestId, behavior) =>
      module.presentNotification(requestId, behavior)
    )
    module.setListeners(
      (requestId, nativeNotification) => {
        const notification = mapNotification(nativeNotification)
        if (!runner.receive(requestId, notification)) return
        receivedListeners.forEach((listener) => listener(notification))
      },
      (nativeResponse) => {
        const response = mapResponse(nativeResponse)
        responseListeners.forEach((listener) => listener(response))
      },
      (token) => {
        if (token.type !== 'ios' && token.type !== 'android') return
        const mapped: DevicePushToken = { type: token.type, data: token.data }
        pushTokenListeners.forEach((listener) => listener(mapped))
      }
    )
    sharedRunner = runner
  }
  return sharedRunner
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
  const token = await module.getDevicePushToken().catch(rethrowNativeError)
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
  events(module).setHandler(handler)
}

// the response that last tapped the app awake, if any. synchronous, like expo.
function getLastResponse(): NotificationResponse | null {
  const response = native()?.getLastNotificationResponse()
  return response ? mapResponse(response) : null
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
  const { content, trigger } = request
  return module
    .scheduleNotification({
      identifier: request.identifier,
      content: {
        ...content,
        data: content.data ? toAnyMap(Object.entries(content.data)) : undefined,
      },
      trigger:
        trigger == null
          ? undefined
          : trigger.type === 'date'
            ? {
                ...trigger,
                date:
                  trigger.date instanceof Date ? trigger.date.getTime() : trigger.date,
              }
            : trigger,
    })
    .catch(rethrowNativeError)
}

async function cancelScheduled(identifier: string): Promise<void> {
  await native()?.cancelScheduledNotification(identifier).catch(rethrowNativeError)
}

async function cancelAllScheduled(): Promise<void> {
  await native()?.cancelAllScheduledNotifications().catch(rethrowNativeError)
}

async function getAllScheduled(): Promise<ScheduledNotification[]> {
  const scheduled = await native()
    ?.getAllScheduledNotifications()
    .catch(rethrowNativeError)
  return scheduled ? scheduled.map(mapRequest) : []
}

async function getPresented(): Promise<Notification[]> {
  const presented = await native()?.getPresentedNotifications().catch(rethrowNativeError)
  return presented ? presented.map(mapNotification) : []
}

async function dismiss(identifier: string): Promise<void> {
  await native()?.dismissNotification(identifier).catch(rethrowNativeError)
}

async function dismissAll(): Promise<void> {
  await native()?.dismissAllNotifications().catch(rethrowNativeError)
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
