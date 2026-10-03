import { notificationPermissionAlerts, useNotificationPermission } from '~/features/notifications/helpers'
import { formatDistanceToNow } from '~/interface/ui/display'
import { router } from 'one'
import { Paragraph, SizableText, Switch, View, XStack, YStack, styled } from 'tamagui'
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
import { SettingsWebChrome } from '~/features/settings/SettingsWebChrome'
import { UnreadDot } from '~/interface/app/UnreadDot'
import { Button } from '~/interface/buttons/Button'
import { Icons } from '~/interface/icons'
import { EmptyState } from '~/interface/layout/EmptyState'
import { PageScrollView } from '~/interface/layout/PageScrollView'
import { SepHeading } from '~/interface/text/Headings'

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
    <SettingsWebChrome>
      <PageScrollView contentPaddingTop={16}>
        <YStack flex={1} flexBasis="auto" pb={60} gap="8">
          <PermissionSection />

          <YStack>
            <XStack items="center" justify="space-between" pr={18} gap={13}>
              <SepHeading>Inbox</SepHeading>
              {unreadCount > 0 ? (
                <Button size="xs" subtle onPress={markAllRead} testID="mark-all-read">
                  Mark all read
                </Button>
              ) : null}
            </XStack>

            {rows.length === 0 ? (
              <EmptyState
                icon={<Icons.Notifications size={40} color="color-11" />}
                title="No notifications yet"
                description="Activity that needs your attention shows up here."
              />
            ) : (
              <YStack testID="notification-list">
                {rows.map((row) => (
                  <NotificationRowFrame
                    key={row.id}
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
                  </NotificationRowFrame>
                ))}
              </YStack>
            )}
          </YStack>

          <PreferenceSection />
        </YStack>
      </PageScrollView>
    </SettingsWebChrome>
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
    <YStack>
      <SepHeading>System notifications</SepHeading>
      <XStack px={18} py={13} items="center" justify="space-between" gap={13}>
        <YStack flex={1} gap="0-5">
          <SizableText size="4" fontWeight="500">
            {copy.title}
          </SizableText>
          <Paragraph size="2" color="color-11">
            {copy.description}
          </Paragraph>
          {permission.error ? (
            <Paragraph size="2" color="red-900">
              Notification permission could not be updated. Try again or open Settings.
            </Paragraph>
          ) : null}
        </YStack>
        {alerts ? null : (
          <Button
            size="sm"
            onPress={() => {
              if (permission.canAskAgain) {
                void permission.request()
                return
              }
            }}
            testID="notification-permission-action"
          >
            {permission.canAskAgain
              ? permission.status === 'provisional'
                ? 'Allow alerts'
                : 'Turn on'
              : 'Open Settings'}
          </Button>
        )}
      </XStack>
    </YStack>
  )
}

// one row per declared workflow. a preference changes presentation only: the
// inbox row above is written either way.
function PreferenceSection() {
  const { preferences, setPreference } = useNotificationPreferences()

  return (
    <YStack>
      <SepHeading>What you get notified about</SepHeading>
      {preferences.map((preference) => {
        const definition = NOTIFICATION_WORKFLOWS[preference.workflow]
        return (
          <YStack key={preference.workflow} px={18} py={13} gap={7}>
            <SizableText size="4" fontWeight="500">
              {definition.label}
            </SizableText>
            <Paragraph size="2" color="color-11">
              {definition.description}
            </Paragraph>
            {definition.supportsForegroundToast ? (
              <PreferenceToggle
                label="Show while the app is open"
                checked={preference.foregroundToastEnabled}
                testID={`notification-toast-${preference.workflow}`}
                onCheckedChange={(next) =>
                  setPreference({ ...preference, foregroundToastEnabled: next })
                }
              />
            ) : null}
            {definition.supportsSystemPush ? (
              <PreferenceToggle
                label="Send a system notification"
                checked={preference.systemPushEnabled}
                testID={`notification-push-${preference.workflow}`}
                onCheckedChange={(next) =>
                  setPreference({ ...preference, systemPushEnabled: next })
                }
              />
            ) : null}
          </YStack>
        )
      })}
    </YStack>
  )
}

function PreferenceToggle({
  label,
  checked,
  testID,
  onCheckedChange,
}: {
  label: string
  checked: boolean
  testID: string
  onCheckedChange: (next: boolean) => void
}) {
  return (
    <XStack items="center" justify="space-between" gap={13} py="0-5">
      <SizableText size="3" color="color-11">
        {label}
      </SizableText>
      {/* borderWidth clears the browser's <button> border, as SettingToggle does */}
      <Switch
        bg="color-5"
        borderWidth={0}
        checked={checked}
        onCheckedChange={onCheckedChange}
        activeStyle={{ backgroundColor: 'green-800' }}
        testID={testID}
      >
        <Switch.Thumb bg="white" boxShadow="0 1px 3px shadow-5" />
      </Switch>
    </XStack>
  )
}

const NotificationRowFrame = styled(XStack, {
  cursor: 'pointer',
  px: 18,
  py: 13,
  gap: 13,
  items: 'flex-start',
  bg: 'hover:color-2 press:color-3',
})
