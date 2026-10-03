import { zql } from 'on-zero'
import { appNotificationPermission } from './permissions'

// the unread indicator only needs to know whether one unread row exists, so it
// never syncs the whole history to draw a dot.
export const newestUnreadNotification = () => {
  return zql.appNotification
    .where(appNotificationPermission)
    .where('readAt', 'IS', null)
    .orderBy('createdAt', 'desc')
    .orderBy('id', 'desc')
    .limit(1)
    .one()
}

// the first notification surface. the server owns the bound so a caller cannot
// turn one synced query into an unbounded history read. later pages continue
// from the last row's `(createdAt, id)`.
export const recentNotifications = (props: {
  cursor?: { id: string; createdAt: number } | null
}) => {
  const q = zql.appNotification
    .where(appNotificationPermission)
    .orderBy('createdAt', 'desc')
    .orderBy('id', 'desc')
    .limit(30)
  return props.cursor ? q.start(props.cursor) : q
}

export const notificationById = (props: { notificationId: string }) => {
  return zql.appNotification
    .where(appNotificationPermission)
    .where('id', props.notificationId)
    .one()
}
