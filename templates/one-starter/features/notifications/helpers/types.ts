import type { ReactNode } from 'react'

export type PushPlatform = 'ios' | 'android'

export type PushRegistrationMeta = Readonly<{
  platform: PushPlatform
}>

export type RegisterDevicePushToken = (
  token: string,
  meta: PushRegistrationMeta,
) => void | Promise<void>

export type PushRegistrationStatus =
  | 'idle'
  | 'requesting-permission'
  | 'registering'
  | 'registered'
  | 'permission-denied'
  | 'unsupported'
  | 'error'

export type PushRegistration = Readonly<{
  status: PushRegistrationStatus
  error: Error | null
  register: () => Promise<string | null>
}>

// the operating system's notification authorization. it governs every
// presentation, so an app that only schedules local notifications needs it too
// and does not need to register for remote push at all.
//
// iOS grants three different authorizations and they are kept apart here,
// because an app that treats them alike promises the user alerts it will not
// get to show:
//
// - `granted`: full authorization, banners and sounds included.
// - `provisional`: quiet authorization granted without a prompt. notifications
//   are delivered to the notification center with no banner and no sound, and
//   the user keeps or turns them off from the notification itself.
// - `ephemeral`: temporary authorization for a short-lived app experience. it
//   ends with the session, so nothing durable should be built on it.
export type NotificationPermissionStatus =
  | 'undetermined'
  | 'granted'
  | 'provisional'
  | 'ephemeral'
  | 'denied'
  | 'unsupported'

export type NotificationPermission = Readonly<{
  status: NotificationPermissionStatus
  // a platform read or prompt failure is reported here. request resolves to
  // the last known status so event handlers never create an unhandled promise.
  error: Error | null
  // false once the platform will no longer show its prompt. the app sends the
  // user to system settings instead of asking again.
  canAskAgain: boolean
  request: () => Promise<NotificationPermissionStatus>
}>

// how one notification event is presented while the app is in the foreground.
// the three values are mutually exclusive presentations of the same event, so
// an app never shows both an operating-system banner and its own presentation.
//
// - `system`: the operating system presents its banner, list entry, and sound.
// - `inApp`: the operating-system presentation is suppressed and the product
//   presents the event itself.
// - `none`: neither presentation runs; the event stays in the app's inbox.
export type NotificationForegroundPolicy = 'inApp' | 'system' | 'none'

// the operating-system presentation options for one incoming foreground
// notification. field names match the platform notification behavior contract.
export type NotificationForegroundPresentation = Readonly<{
  shouldShowBanner: boolean
  shouldShowList: boolean
  shouldPlaySound: boolean
  shouldSetBadge: boolean
}>

// the notification payload key carrying the sending product's own event id.
// the platform's request identifier is assigned by the operating system or the
// push service and is not the product's durable identity, so it is never used
// as one.
export const NOTIFICATION_ID_DATA_KEY = 'notificationId'

// one user interaction with a delivered notification whose payload carried a
// usable event id. the app resolves `notificationId` against its own records
// and decides where to navigate; this package never routes.
export type NotificationResponseEvent = Readonly<{
  status: 'ok'
  notificationId: string
  actionIdentifier: string
  data: Readonly<Record<string, unknown>>
}>

// a user interaction the app cannot act on, because the payload did not carry
// the product event id. reported rather than dropped so a malformed sender is
// visible instead of silently doing nothing.
export type NotificationResponseIssue = Readonly<{
  status: 'invalid-payload'
  reason: 'missing-notification-id'
  actionIdentifier: string
  data: Readonly<Record<string, unknown>>
}>

export type NotificationResponseResult =
  | NotificationResponseEvent
  | NotificationResponseIssue

export type NotificationResponseHandler = (result: NotificationResponseResult) => void

export type NotificationsProviderProps = Readonly<{
  children: ReactNode
  // omitted by an app that only presents its own local notifications: there is
  // no device token to hand anywhere, and `usePushRegistration()` reports
  // `unsupported` instead of asking for permission it would not use.
  register?: RegisterDevicePushToken
  foregroundPolicy?: NotificationForegroundPolicy
  onNotificationResponse?: NotificationResponseHandler
}>
