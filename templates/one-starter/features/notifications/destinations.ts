/**
 * @agent-rule
 * a notification destination is a logical target, never a url. add a kind here
 * and resolve it in `notificationDestinationHref`; a row whose kind is not in
 * this union opens the notification list instead of navigating anywhere.
 */
import { APP_PROFILE_HREF, postDetailHref } from '~/features/app/routes'
import type { Href } from 'one'

export type NotificationDestination =
  | { kind: 'post'; id: string }
  | { kind: 'profile'; id: string }
  | { kind: 'notifications' }

export type NotificationDestinationKind = NotificationDestination['kind']

// the two synced columns behind one destination. stored split rather than as
// json so no row needs parsing before it can be rendered or filtered.
export type StoredNotificationDestination = Readonly<{
  destinationKind: string
  destinationId: string | null
}>

export function storeNotificationDestination(
  destination: NotificationDestination,
): StoredNotificationDestination {
  return {
    destinationKind: destination.kind,
    destinationId: 'id' in destination ? destination.id : null,
  }
}

// a stored destination the app can still open. a kind this build does not know,
// or a kind whose target id is missing, resolves to null so the notification
// opens in place rather than sending the user somewhere unrelated.
export function readNotificationDestination(
  stored: StoredNotificationDestination,
): NotificationDestination | null {
  const id = stored.destinationId
  switch (stored.destinationKind) {
    case 'post':
      return id ? { kind: 'post', id } : null
    case 'profile':
      return id ? { kind: 'profile', id } : null
    case 'notifications':
      return { kind: 'notifications' }
    default:
      return null
  }
}

export function notificationDestinationHref(destination: NotificationDestination): Href | null {
  switch (destination.kind) {
    case 'post':
      return postDetailHref(destination.id)
    case 'profile':
      return APP_PROFILE_HREF
    case 'notifications':
      return null
  }
}
