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
