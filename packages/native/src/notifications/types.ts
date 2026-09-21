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
