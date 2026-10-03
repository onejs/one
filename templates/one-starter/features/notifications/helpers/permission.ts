import type { NotificationPermissionStatus } from './types'

// the fields this package reads from a platform permission response. taking the
// shape rather than the platform type keeps the mapping readable and testable
// without a notification module present.
export type NotificationPermissionResponse = Readonly<{
  granted: boolean
  canAskAgain: boolean
  status: string
  ios?: { status: IosAuthorization } | null
}>

// the iOS authorization the platform actually granted. provisional and
// ephemeral are separate authorizations, not shades of "granted": provisional
// delivers quietly to the notification center with no banner or sound, and
// ephemeral is the temporary authorization a short-lived app experience gets.
export type IosAuthorization =
  | 'notDetermined'
  | 'denied'
  | 'authorized'
  | 'provisional'
  | 'ephemeral'

export type NotificationPermissionState = Readonly<{
  status: NotificationPermissionStatus
  canAskAgain: boolean
}>

// iOS reports the authorization it actually granted, so it decides. every other
// platform reports one cross-platform status and is read from that.
export function readNotificationPermission(
  response: NotificationPermissionResponse,
): NotificationPermissionState {
  const canAskAgain = response.canAskAgain
  const ios = response.ios
  if (ios) return { status: iosStatus(ios.status), canAskAgain }
  if (response.granted) return { status: 'granted', canAskAgain }
  if (response.status === 'undetermined') return { status: 'undetermined', canAskAgain }
  return { status: 'denied', canAskAgain }
}

function iosStatus(authorization: IosAuthorization): NotificationPermissionStatus {
  switch (authorization) {
    case 'notDetermined':
      return 'undetermined'
    case 'authorized':
      return 'granted'
    case 'denied':
    case 'provisional':
    case 'ephemeral':
      return authorization
  }
}

// whether the platform will deliver notifications at all. provisional counts:
// it is real authorization, just a quiet one.
export function notificationPermissionDelivers(
  status: NotificationPermissionStatus,
): boolean {
  return status === 'granted' || status === 'provisional' || status === 'ephemeral'
}

// whether a delivered notification may interrupt with a banner and sound.
// provisional never does, so copy that promises alerts is wrong for it.
export function notificationPermissionAlerts(
  status: NotificationPermissionStatus,
): boolean {
  return status === 'granted' || status === 'ephemeral'
}
