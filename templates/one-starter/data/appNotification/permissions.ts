import { serverWhere } from 'on-zero'

// a notification belongs to exactly one recipient and is never public.
export const appNotificationPermission = serverWhere('appNotification', (q, auth) =>
  q.cmp('userId', auth?.id ?? ''),
)
