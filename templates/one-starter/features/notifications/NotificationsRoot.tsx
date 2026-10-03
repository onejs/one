import {
  NotificationsProvider,
  presentsInAppNotification,
  useNotificationForegroundPolicy,
  type NotificationForegroundPolicy,
  type NotificationResponseResult,
} from '~/features/notifications/helpers'
import { showToast } from '~/interface/ui/toast/Toast'
import { router } from 'one'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { notificationById } from '~/data/appNotification/queries'
import { useQuery } from '~/data/zero-client'
import { APP_SETTINGS_NOTIFICATIONS_HREF } from '~/features/app/routes'
import { notificationDestinationHref, readNotificationDestination } from './destinations'
import {
  useNotificationList,
  useNotificationPreferences,
  useNotificationReadActions,
} from './useNotificationInbox'

// this app presents notification events itself while it is open, so the
// operating system's foreground banner stays suppressed and the user never sees
// the same event twice.
const FOREGROUND_POLICY: NotificationForegroundPolicy = 'inApp'

export function NotificationsRoot({ children }: { children: ReactNode }) {
  const [openingId, setOpeningId] = useState<string | null>(null)

  const onResponse = useCallback((result: NotificationResponseResult) => {
    // a payload with no event id names nothing to open, so the tap leaves the
    // user where they are rather than guessing a destination.
    if (result.status !== 'ok') return
    setOpeningId(result.notificationId)
  }, [])

  // only the app's authenticated backend may mint registration tokens for it.
  // generated apps leave this off until their backend serves that mint; the
  // inbox and foreground presentation work without it.
  return (
    <NotificationsProvider foregroundPolicy={FOREGROUND_POLICY} onNotificationResponse={onResponse}>
      <NotificationPresenter />
      {openingId ? (
        <NotificationOpener notificationId={openingId} onDone={() => setOpeningId(null)} />
      ) : null}
      {children}
    </NotificationsProvider>
  )
}

// a tapped notification is resolved through the recipient-scoped query, so
// authorization is checked again at open time rather than trusted from the
// payload. an event this user may not read resolves to nothing and the tap
// lands on the notification list.
function NotificationOpener({
  notificationId,
  onDone,
}: {
  notificationId: string
  onDone: () => void
}) {
  const [row, { type }] = useQuery(notificationById, { notificationId })
  const { markRead } = useNotificationReadActions()

  useEffect(() => {
    if (type !== 'complete') return
    if (!row) {
      router.push(APP_SETTINGS_NOTIFICATIONS_HREF)
      onDone()
      return
    }
    markRead(row.id)
    const destination = readNotificationDestination(row)
    const href = destination ? notificationDestinationHref(destination) : null
    router.push(href ?? APP_SETTINGS_NOTIFICATIONS_HREF)
    onDone()
  }, [markRead, onDone, row, type])

  return null
}

// the product's own foreground presentation. it is driven by the synced inbox
// row rather than by the notification that triggered it, so a local event and a
// delivered one present identically, and each event id presents once.
function NotificationPresenter() {
  const policy = useNotificationForegroundPolicy()
  const [notifications] = useNotificationList()
  const { preferences } = useNotificationPreferences()
  const { markRead } = useNotificationReadActions()
  const presentedRef = useRef<Set<string> | null>(null)

  useEffect(() => {
    if (!presentsInAppNotification(policy)) return
    const rows = notifications ?? []
    const previous = presentedRef.current
    // the first sync is history, not new arrivals.
    if (!previous) {
      presentedRef.current = new Set(rows.map((row) => row.id))
      return
    }

    for (const row of rows) {
      if (previous.has(row.id) || row.readAt !== null) continue
      previous.add(row.id)
      const preference = preferences.find((item) => item.workflow === row.workflow)
      if (preference?.foregroundToastEnabled ?? true) {
        showToast(row.title, {
          id: row.id,
          description: row.body,
          action: {
            label: 'Open',
            onPress: () => {
              markRead(row.id)
              const destination = readNotificationDestination(row)
              const href = destination ? notificationDestinationHref(destination) : null
              router.push(href ?? APP_SETTINGS_NOTIFICATIONS_HREF)
            },
          },
        })
        continue
      }
      // system delivery is a background adapter over this durable row. it is
      // intentionally absent until the delivery outbox exists.
    }

    // a long-running session keeps only a bounded dedupe set. rows that have
    // left the fixed newest page cannot return without a new id.
    if (previous.size > 512) {
      presentedRef.current = new Set(rows.map((row) => row.id))
    }
  }, [markRead, notifications, policy, preferences])

  return null
}
