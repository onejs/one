import { notificationPermissionAlerts, useNotificationPermission } from '~/features/notifications/helpers'
import { formatDistanceToNow } from '~/interface/ui/display'
import { Form, Section, SubmitButton, ToggleField, ValueField } from '~/interface/ui/forms/Form'
import { One, router } from 'one'
import { Paragraph, SizableText, View, XStack, YStack } from 'tamagui'
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
import { UnreadDot } from '~/interface/app/UnreadDot'
import { Icons } from '~/interface/icons'
import { EmptyState } from '~/interface/layout/EmptyState'

// the android leg: the shared Form instead of SwiftUI. same sections, same
// rows, same test ids; the inbox rows mirror the web leg inside the section.
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
    <Form>
      <PermissionSection />
      <Section title="Inbox">
        {unreadCount > 0 ? (
          <SubmitButton label="Mark all read" onPress={markAllRead} testID="mark-all-read" />
        ) : null}
        {rows.length === 0 ? (
          <EmptyState
            icon={<Icons.Notifications size={40} color="color-11" />}
            title="No notifications yet"
            description="Activity that needs your attention shows up here."
          />
        ) : (
          rows.map((row) => (
            <XStack
              key={row.id}
              py={13}
              gap={13}
              items="flex-start"
              bg="press:color-3"
              role="button"
              onPress={() => open(row)}
              testID={`notification-row-${row.id}`}
            >
              <View width={8} pt={7}>
                {row.readAt === null ? <UnreadDot /> : null}
              </View>
              <YStack flex={1} gap="0-5">
                <SizableText size="4" fontWeight={row.readAt === null ? '700' : '500'}>
                  {row.title}
                </SizableText>
                <Paragraph size="3" color="color-11">
                  {row.body}
                </Paragraph>
                <SizableText size="1" color="color-10">
                  {formatDistanceToNow(row.createdAt)}
                </SizableText>
              </YStack>
            </XStack>
          ))
        )}
      </Section>
      <PreferenceSection />
    </Form>
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
    <Section
      title="System notifications"
      footer={
        permission.error
          ? 'Notification permission could not be updated. Try again or open Settings.'
          : copy.description
      }
    >
      <ValueField label="Status" value={copy.title} />
      {alerts ? null : (
        <SubmitButton
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
    </Section>
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
          <Section
            key={preference.workflow}
            title={definition.label}
            footer={definition.description}
          >
            {definition.supportsForegroundToast ? (
              <ToggleField
                label="Show while the app is open"
                value={preference.foregroundToastEnabled}
                onValueChange={(next) =>
                  setPreference({ ...preference, foregroundToastEnabled: next })
                }
                testID={`notification-toast-${preference.workflow}`}
              />
            ) : null}
            {definition.supportsSystemPush ? (
              <ToggleField
                label="Send a system notification"
                value={preference.systemPushEnabled}
                onValueChange={(next) => setPreference({ ...preference, systemPushEnabled: next })}
                testID={`notification-push-${preference.workflow}`}
              />
            ) : null}
          </Section>
        )
      })}
    </>
  )
}
