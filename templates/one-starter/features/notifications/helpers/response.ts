import { NOTIFICATION_ID_DATA_KEY } from './types'
import type { NotificationResponseResult } from './types'

// the fields a platform notification response contributes. taking the payload
// rather than the platform object keeps this readable and testable without a
// notification module present.
export type NotificationResponseInput = Readonly<{
  actionIdentifier: string
  data: unknown
}>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// read one platform response into the product's own event identity. the id must
// be a non-empty string the sender put in the payload; anything else is an
// invalid payload the app can report rather than a tap that silently does
// nothing.
export function readNotificationResponse(
  input: NotificationResponseInput,
): NotificationResponseResult {
  const data = isRecord(input.data) ? input.data : {}
  const notificationId = data[NOTIFICATION_ID_DATA_KEY]
  const shared = {
    actionIdentifier: input.actionIdentifier,
    data,
  }
  if (typeof notificationId !== 'string' || notificationId.length === 0) {
    return { status: 'invalid-payload', reason: 'missing-notification-id', ...shared }
  }
  return { status: 'ok', notificationId, ...shared }
}

// one response is identified by the event it belongs to plus the action the
// user took, so a tap and a category action on the same event stay distinct.
// an invalid payload has no product identity, so it is never deduplicated.
export function notificationResponseKey(
  result: NotificationResponseResult,
): string | null {
  if (result.status !== 'ok') return null
  return `${result.notificationId} ${result.actionIdentifier}`
}
