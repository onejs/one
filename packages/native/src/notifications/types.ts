// public types for the Notifications namespace. payload shapes follow
// expo-notifications; platform enums are string unions, with native ints
// and legacy numbers mapped at the js boundary below.
export type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined'

export type IosAuthorizationStatus =
  | 'not-determined'
  | 'denied'
  | 'authorized'
  | 'provisional'
  | 'ephemeral'

export interface NotificationPermissionRequest {
  ios?: {
    allowAlert?: boolean
    allowBadge?: boolean
    allowSound?: boolean
    allowProvisional?: boolean
  }
}

export interface NotificationPermissionResponse {
  status: NotificationPermissionStatus
  granted: boolean
  canAskAgain: boolean
  ios?: { status: IosAuthorizationStatus }
}

// UNAuthorizationStatus 0 not determined, 1 denied, 2 authorized,
// 3 provisional, 4 ephemeral. strings pass through for forward
// compatibility with newer natives.
export function fromNativeAuthorizationStatus(
  status: number | IosAuthorizationStatus
): IosAuthorizationStatus {
  if (typeof status === 'string') return status
  switch (status) {
    case 0:
      return 'not-determined'
    case 1:
      return 'denied'
    case 2:
      return 'authorized'
    case 3:
      return 'provisional'
    case 4:
      return 'ephemeral'
    default:
      return 'not-determined'
  }
}

export type NotificationImportance = 'none' | 'min' | 'low' | 'default' | 'high' | 'max'

const importanceToInt: Record<NotificationImportance, number> = {
  none: 0,
  min: 1,
  low: 2,
  default: 3,
  high: 4,
  max: 5,
}

// legacy expo numbers 0-5 still map; anything else is a caller error, thrown
// with the same message on web and native.
export function toNativeImportance(value: NotificationImportance | number): number {
  if (typeof value === 'number') {
    if (!Number.isInteger(value) || value < 0 || value > 5) {
      throw new Error(
        'Notifications.setChannel: importance must be one of none, min, low, default, high, max'
      )
    }
    return value
  }
  const mapped = importanceToInt[value]
  if (mapped === undefined) {
    throw new Error(
      'Notifications.setChannel: importance must be one of none, min, low, default, high, max'
    )
  }
  return mapped
}

export function fromNativeImportance(value: number): NotificationImportance {
  switch (value) {
    case 0:
      return 'none'
    case 1:
      return 'min'
    case 2:
      return 'low'
    case 3:
      return 'default'
    case 4:
      return 'high'
    case 5:
      return 'max'
    default:
      return 'default'
  }
}

export interface NotificationChannelInput {
  name: string
  importance: NotificationImportance
  description?: string
  sound?: boolean
  vibrationPattern?: number[]
  showBadge?: boolean
}

export interface NotificationChannel {
  id: string
  name: string
  importance: NotificationImportance
  description?: string
  sound: boolean
  vibrationPattern?: number[]
  showBadge: boolean
}

// the tap action, matching expo's default action identifier. categories and
// custom actions are out of scope, so every response carries this.
export const DEFAULT_ACTION_IDENTIFIER = 'expo.modules.notifications.actions.DEFAULT'

export interface NotificationContentInput {
  title?: string
  subtitle?: string
  body?: string
  data?: Record<string, unknown>
  sound?: boolean
  badge?: number
}

export interface NotificationContent {
  title: string | null
  subtitle: string | null
  body: string | null
  data: Record<string, unknown>
  sound: boolean
  badge: number | null
}

export type NotificationTriggerInput =
  | null
  | { type: 'timeInterval'; seconds: number; repeats?: boolean; channelId?: string }
  | { type: 'date'; date: number | Date; channelId?: string }

export interface NotificationScheduleInput {
  identifier?: string
  content: NotificationContentInput
  trigger: NotificationTriggerInput
}

export type NotificationTrigger =
  | { type: 'timeInterval'; seconds: number; repeats: boolean }
  | { type: 'date'; date: number }
  | { type: 'push' }
  | { type: 'unknown' }

export interface NotificationRequest {
  identifier: string
  content: NotificationContent
  trigger: NotificationTrigger
}

export interface Notification {
  request: NotificationRequest
  date: number
}

export interface NotificationResponse {
  notification: Notification
  actionIdentifier: string
}

export interface ScheduledNotification {
  identifier: string
  content: NotificationContent
  trigger: NotificationTrigger
}

export interface NotificationBehavior {
  shouldShowBanner: boolean
  shouldShowList: boolean
  shouldPlaySound: boolean
  shouldSetBadge: boolean
}

export interface NotificationHandlerInput {
  handleNotification: (
    notification: Notification
  ) => Promise<NotificationBehavior> | NotificationBehavior
}

export interface NotificationSubscription {
  remove(): void
}
