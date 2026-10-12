// public types for the Notifications namespace. payload shapes follow
// expo-notifications; platform enums are string unions, with native ints
// and legacy numbers mapped at the js boundary below.
export type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined'

export type IosAuthorizationStatus =
  | 'notDetermined'
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
      return 'notDetermined'
    case 1:
      return 'denied'
    case 2:
      return 'authorized'
    case 3:
      return 'provisional'
    case 4:
      return 'ephemeral'
    default:
      return 'notDetermined'
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

// the tap action, matching expo's default action identifier. a tap on the
// notification body reports this; taps on category actions report their
// own identifiers.
export const DEFAULT_ACTION_IDENTIFIER = 'expo.modules.notifications.actions.DEFAULT'

export interface NotificationActionOptions {
  // require device authentication before firing. defaults to false.
  isAuthenticationRequired?: boolean
  // mark the action destructive. defaults to false.
  isDestructive?: boolean
  // bring the app to the foreground when the action fires. defaults to
  // true, like expo.
  opensAppToForeground?: boolean
}

export interface NotificationTextInput {
  // placeholder of the text field the action opens.
  placeholder: string
  // title of the submit button. the platform default when unset.
  submitButtonTitle?: string
}

export interface NotificationAction {
  // unique within the category. arrives as actionIdentifier on the response.
  identifier: string
  // the button title in the system notification UI.
  buttonTitle: string
  options?: NotificationActionOptions
  // when set, the action opens a text field and the typed text arrives as
  // userText on the response.
  textInput?: NotificationTextInput
}

export interface NotificationCategoryOptions {
  // ios-only extras, all optional. allowAnnouncement is accepted and
  // ignored by the platform, like expo.
  allowInCarPlay?: boolean
  allowAnnouncement?: boolean
  categorySummaryFormat?: string
  customDismissAction?: boolean
  intentIdentifiers?: string[]
  previewPlaceholder?: string
  showTitle?: boolean
  showSubtitle?: boolean
}

export interface NotificationCategory {
  identifier: string
  actions: NotificationAction[]
  options?: NotificationCategoryOptions
}

// shared argument checks for categories: identical checks and messages on
// web and native. each names the offending field, so the caller can fix it
// without guessing.
export function assertCategoryIdentifier(identifier: unknown, verb: string): asserts identifier is string {
  if (typeof identifier !== 'string' || identifier.length === 0) {
    throw new Error(`Notifications.${verb}: identifier must be a non-empty string`)
  }
  if (identifier.includes(':') || identifier.includes('-')) {
    throw new Error(
      `Notifications.${verb}: identifier must not contain ':' or '-'`
    )
  }
}

function assertBooleans(
  verb: string,
  what: string,
  value: Record<string, unknown> | undefined,
  fields: string[]
): void {
  if (value === undefined) return
  for (const field of fields) {
    const entry = value[field]
    if (entry !== undefined && typeof entry !== 'boolean') {
      throw new Error(`Notifications.${verb}: ${what}.${field} must be a boolean`)
    }
  }
}

export function assertCategoryActions(actions: unknown, verb: string): asserts actions is NotificationAction[] {
  if (!Array.isArray(actions)) {
    throw new Error(`Notifications.${verb}: actions must be an array`)
  }
  for (const action of actions) {
    if (!action || typeof action !== 'object') {
      throw new Error(`Notifications.${verb}: each action must be an object`)
    }
    const { identifier, buttonTitle, options, textInput } = action as Record<string, unknown>
    if (typeof identifier !== 'string' || identifier.length === 0) {
      throw new Error(`Notifications.${verb}: each action needs a non-empty identifier`)
    }
    if (typeof buttonTitle !== 'string' || buttonTitle.length === 0) {
      throw new Error(`Notifications.${verb}: each action needs a non-empty buttonTitle`)
    }
    if (options !== undefined && (typeof options !== 'object' || options === null)) {
      throw new Error(`Notifications.${verb}: action options must be an object`)
    }
    assertBooleans(verb, 'action options', options as Record<string, unknown> | undefined, [
      'isAuthenticationRequired',
      'isDestructive',
      'opensAppToForeground',
    ])
    if (textInput !== undefined) {
      if (typeof textInput !== 'object' || textInput === null) {
        throw new Error(`Notifications.${verb}: action textInput must be an object`)
      }
      const { placeholder, submitButtonTitle } = textInput as Record<string, unknown>
      if (typeof placeholder !== 'string' || placeholder.length === 0) {
        throw new Error(`Notifications.${verb}: action textInput needs a non-empty placeholder`)
      }
      if (submitButtonTitle !== undefined && typeof submitButtonTitle !== 'string') {
        throw new Error(`Notifications.${verb}: action textInput.submitButtonTitle must be a string`)
      }
    }
  }
}

export function assertCategoryOptions(
  options: NotificationCategoryOptions | undefined,
  verb: string
): void {
  if (options === undefined) return
  if (!options || typeof options !== 'object') {
    throw new Error(`Notifications.${verb}: options must be an object`)
  }
  assertBooleans(verb, 'options', options as unknown as Record<string, unknown>, [
    'allowInCarPlay',
    'allowAnnouncement',
    'customDismissAction',
    'showTitle',
    'showSubtitle',
  ])
  if (
    options.categorySummaryFormat !== undefined &&
    typeof options.categorySummaryFormat !== 'string'
  ) {
    throw new Error(`Notifications.${verb}: options.categorySummaryFormat must be a string`)
  }
  if (
    options.previewPlaceholder !== undefined &&
    typeof options.previewPlaceholder !== 'string'
  ) {
    throw new Error(`Notifications.${verb}: options.previewPlaceholder must be a string`)
  }
  if (options.intentIdentifiers !== undefined) {
    if (
      !Array.isArray(options.intentIdentifiers) ||
      options.intentIdentifiers.some((entry) => typeof entry !== 'string')
    ) {
      throw new Error(`Notifications.${verb}: options.intentIdentifiers must be string[]`)
    }
  }
}

export interface NotificationContentInput {
  title?: string
  subtitle?: string
  body?: string
  data?: Record<string, unknown>
  sound?: boolean
  badge?: number
  // interactive category identifier, registered with setCategory first.
  categoryIdentifier?: string
}

export interface NotificationContent {
  title: string | null
  subtitle: string | null
  body: string | null
  data: Record<string, unknown>
  sound: boolean
  badge: number | null
  categoryIdentifier: string | null
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
  // the typed text for a text-input action. absent otherwise.
  userText?: string
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

// remote push token, matching expo-notifications' DevicePushToken: the apns
// hex token on ios, the fcm registration token on android.
export type DevicePushTokenType = 'ios' | 'android'

export interface DevicePushToken {
  type: DevicePushTokenType
  data: string
}
