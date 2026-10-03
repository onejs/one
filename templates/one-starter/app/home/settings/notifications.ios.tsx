import { notificationPermissionAlerts, useNotificationPermission } from '~/features/notifications/helpers'
import { formatDistanceToNow } from '~/interface/ui/display'
import { One, router } from 'one'
import {
  notificationDestinationHref,
  readNotificationDestination,
} from '~/features/notifications/destinations'
import { PERMISSION_COPY } from '~/features/notifications/permissionCopy'
import {
  useNotificationList,
  useNotificationPreferences,
  useNotificationReadActions,
} from '~/features/notifications/useNotificationInbox'
import { NOTIFICATION_WORKFLOWS } from '~/features/notifications/workflows'

// notifications is a grouped Form under the stack's own navigation bar:
// permission status, the inbox, then one section per workflow with native
// Toggles. the inbox rows carry three lines and an unread mark, which the
// shared Form contract does not express, so this screen is on One.iOS
// directly.
export default function NotificationsSettingsPage() {
  const [notifications] = useNotificationList()
  const { markRead, markAllRead } = useNotificationReadActions()
  const rows = notifications ?? []
  const unreadCount = rows.filter((row) => row.readAt === null).length

  const open = (row: (typeof rows)[number]) => {
    markRead(row.id)
    const destination = readNotificationDestination(row)
    const href = destination ? notificationDestinationHref(destination) : null
    // an unknown or missing target leaves the user on this list rather than
    // sending them somewhere unrelated.
    if (href) router.push(href)
  }

  return (
    <One.iOS.Form style={{ flex: 1 }}>
      <PermissionSection />
      <SectionInbox rows={rows} unreadCount={unreadCount} markAllRead={markAllRead} open={open} />
      <PreferenceSection />
    </One.iOS.Form>
  )
}

function SectionInbox({
  rows,
  unreadCount,
  markAllRead,
  open,
}: {
  rows: NonNullable<ReturnType<typeof useNotificationList>[0]>
  unreadCount: number
  markAllRead: () => void
  open: (row: NonNullable<ReturnType<typeof useNotificationList>[0]>[number]) => void
}) {
  return (
    <One.iOS.Section title="Inbox">
      {unreadCount > 0 ? (
        <One.iOS.Button label="Mark all read" onPress={markAllRead} testID="mark-all-read" />
      ) : null}
      {rows.length === 0 ? (
        <One.iOS.ContentUnavailableView
          title="No notifications yet"
          systemImage="bell"
          description="Activity that needs your attention shows up here."
          actions={[]}
        />
      ) : (
        rows.map((row) => (
          <One.iOS.Button
            key={row.id}
            onPress={() => open(row)}
            testID={`notification-row-${row.id}`}
          >
            <One.iOS.HStack alignment="leading" spacing={8}>
              <One.iOS.VStack alignment="leading" spacing={2}>
                <One.iOS.Text text={row.title} />
                <One.iOS.Text text={row.body} swiftStyle={{ foregroundStyle: '#8E8E93' }} />
                <One.iOS.Text
                  text={formatDistanceToNow(row.createdAt)}
                  swiftStyle={{ foregroundStyle: '#8E8E93' }}
                />
              </One.iOS.VStack>
              <One.iOS.Spacer />
              {row.readAt === null ? (
                <One.iOS.Circle fill="#FF3B30" swiftStyle={{ width: 8, height: 8 }} />
              ) : null}
            </One.iOS.HStack>
          </One.iOS.Button>
        ))
      )}
    </One.iOS.Section>
  )
}

// notification authorization gates every operating-system presentation,
// including the app's own scheduled reminders. it is asked for here and in the
// flow that first needs it, never at launch.
function PermissionSection() {
  const permission = useNotificationPermission()
  if (permission.status === 'unsupported') return null

  const copy = PERMISSION_COPY[permission.status]
  // quiet authorization is real, so the only thing left to ask for is alerts.
  const alerts = notificationPermissionAlerts(permission.status)

  return (
    <One.iOS.Section
      title="System notifications"
      footer={
        permission.error
          ? 'Notification permission could not be updated. Try again or open Settings.'
          : copy.description
      }
    >
      <One.iOS.LabeledContent label="Status" value={copy.title} />
      {alerts ? null : (
        <One.iOS.Button
          label={
            permission.canAskAgain
              ? permission.status === 'provisional'
                ? 'Allow alerts'
                : 'Turn on'
              : 'Open Settings'
          }
          onPress={() => {
            if (permission.canAskAgain) {
              void permission.request()
              return
            }
            void One.openSettings()
          }}
          testID="notification-permission-action"
        />
      )}
    </One.iOS.Section>
  )
}

// one section per declared workflow. a preference changes presentation only:
// the inbox row above is written either way.
function PreferenceSection() {
  const { preferences, setPreference } = useNotificationPreferences()

  return (
    <>
      {preferences.map((preference) => {
        const definition = NOTIFICATION_WORKFLOWS[preference.workflow]
        return (
          <One.iOS.Section
            key={preference.workflow}
            title={definition.label}
            footer={definition.description}
          >
            {definition.supportsForegroundToast ? (
              <One.iOS.Toggle
                label="Show while the app is open"
                isOn={preference.foregroundToastEnabled}
                onIsOnChange={(next) =>
                  setPreference({ ...preference, foregroundToastEnabled: next })
                }
                testID={`notification-toast-${preference.workflow}`}
              />
            ) : null}
            {definition.supportsSystemPush ? (
              <One.iOS.Toggle
                label="Send a system notification"
                isOn={preference.systemPushEnabled}
                onIsOnChange={(next) => setPreference({ ...preference, systemPushEnabled: next })}
                testID={`notification-push-${preference.workflow}`}
              />
            ) : null}
          </One.iOS.Section>
        )
      })}
    </>
  )
}
