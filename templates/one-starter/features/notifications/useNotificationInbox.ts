import { useMutation } from 'on-zero'
import { useCallback } from 'react'
import { newestUnreadNotification, recentNotifications } from '~/data/appNotification/queries'
import { notificationPreferences } from '~/data/notificationPreference/queries'
import { useQuery, zero } from '~/data/zero-client'
import { NOTIFICATION_WORKFLOW_ORDER, NOTIFICATION_WORKFLOWS } from './workflows'
import type { NotificationWorkflowId } from './workflows'

// the unread indicator asks only whether one unread row exists.
export function useHasUnreadNotifications(): boolean {
  const [newest] = useQuery(newestUnreadNotification, {})
  return Boolean(newest)
}

export function useNotificationList() {
  return useQuery(recentNotifications, {
    cursor: null,
  })
}

export function useNotificationReadActions() {
  const [markRead] = useMutation(
    (props: Parameters<typeof zero.mutate.appNotification.markRead>[0]) =>
      zero.mutate.appNotification.markRead(props),
  )
  const [markAllRead] = useMutation(
    (props: Parameters<typeof zero.mutate.appNotification.markAllRead>[0]) =>
      zero.mutate.appNotification.markAllRead(props),
  )

  return {
    // reading, syncing, or dismissing a presentation never marks a row read.
    // opening its destination and choosing mark read are the only two paths,
    // and both land here.
    markRead: useCallback((id: string) => markRead({ id, readAt: Date.now() }), [markRead]),
    markAllRead: useCallback(() => markAllRead({ readAt: Date.now() }), [markAllRead]),
  }
}

export type NotificationWorkflowPreference = Readonly<{
  workflow: NotificationWorkflowId
  foregroundToastEnabled: boolean
  systemPushEnabled: boolean
}>

// every declared workflow, with the user's stored choice where one exists and
// the workflow's own defaults where it does not.
export function useNotificationPreferences(): {
  preferences: NotificationWorkflowPreference[]
  setPreference: (next: NotificationWorkflowPreference) => void
} {
  const [rows] = useQuery(notificationPreferences, {})
  const [upsert] = useMutation(
    (props: Parameters<typeof zero.mutate.notificationPreference.upsert>[0]) =>
      zero.mutate.notificationPreference.upsert(props),
  )

  const preferences = NOTIFICATION_WORKFLOW_ORDER.map((workflow) => {
    const definition = NOTIFICATION_WORKFLOWS[workflow]
    const stored = rows?.find((row) => row.workflow === workflow)
    return {
      workflow,
      foregroundToastEnabled:
        stored?.foregroundToastEnabled ?? definition.defaultForegroundToastEnabled,
      systemPushEnabled: stored?.systemPushEnabled ?? definition.defaultSystemPushEnabled,
    }
  })

  const setPreference = useCallback(
    (next: NotificationWorkflowPreference) => {
      upsert({ ...next, updatedAt: Date.now() })
    },
    [upsert],
  )

  return { preferences, setPreference }
}
