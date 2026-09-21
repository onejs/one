// permission types for @vxrn/native/notifications, a name-for-name subset
// of expo-notifications: migrating means changing the import.
export type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined'

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
  ios?: { status: number }
}

// android channel importances, matching expo's numeric enum and the
// platform importance_none through importance_max.
export const AndroidImportance = {
  NONE: 0,
  MIN: 1,
  LOW: 2,
  DEFAULT: 3,
  HIGH: 4,
  MAX: 5,
} as const

export type AndroidImportance =
  (typeof AndroidImportance)[keyof typeof AndroidImportance]

export interface NotificationChannelInput {
  name: string
  importance: AndroidImportance
  description?: string
  sound?: boolean
  vibrationPattern?: number[]
  showBadge?: boolean
}

export interface NotificationChannel {
  id: string
  name: string
  importance: AndroidImportance
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
