import {
  Form,
  NavigationRow,
  Section,
  SubmitButton,
  ToggleField,
} from '~/interface/ui/forms/Form'
import { One, useRouter } from 'one'
import { Paragraph, XStack } from 'tamagui'
import { APP_NAME_LOWERCASE, DOMAIN } from '~/constants'
import { useSettingsData } from '~/features/settings/useSettingsData'
import { UnreadDot } from '~/interface/app/UnreadDot'
import { Icons } from '~/interface/icons'

// the android leg: the shared Form, whose Tamagui leg draws the rows. every
// row kind reaches the pattern except the unread-dot row, which mirrors the
// web leg's row (icon, title, dot, caret) inside the shared Section.
export default function SettingsPage() {
  const router = useRouter()
  const { sections } = useSettingsData()

  return (
    <Form>
      {sections.map((section, index) => (
        <Section
          key={section.title}
          title={section.title}
          footer={
            index === sections.length - 1 ? `${APP_NAME_LOWERCASE} v1.0.0` : undefined
          }
        >
          {section.items.map((item) => {
            const testID = `setting-${item.id}`
            if (item.toggle) {
              return (
                <ToggleField
                  key={item.id}
                  label={item.title}
                  value={item.toggle.checked}
                  onValueChange={item.toggle.onCheckedChange}
                  testID={`setting-toggle-${item.id}`}
                />
              )
            }
            if (item.onPress) {
              if (item.destructive) {
                return (
                  <SubmitButton
                    key={item.id}
                    label={item.title}
                    destructive
                    onPress={item.onPress}
                    testID={testID}
                  />
                )
              }
              return (
                <NavigationRow
                  key={item.id}
                  label={item.title}
                  icon={item.icon}
                  onPress={item.onPress}
                  testID={testID}
                />
              )
            }
            if (!item.href) return null
            if (item.external) {
              return (
                <NavigationRow
                  key={item.id}
                  label={item.title}
                  icon={item.icon}
                  onPress={() => One.openURL(`https://${DOMAIN}${item.href}`)}
                  testID={testID}
                />
              )
            }
            const href = item.href
            // an unread mark rides a custom label: title plus the dot, never
            // a count to reconcile. NavigationRow takes a plain label, so this
            // one row mirrors the web leg: icon, title, dot, caret.
            if (item.showsUnreadDot) {
              const Icon = item.icon
              return (
                <XStack
                  key={item.id}
                  minH={56}
                  py={9}
                  items="center"
                  justify="space-between"
                  gap={13}
                  role="button"
                  onPress={() => router.push(href)}
                  testID={testID}
                >
                  <XStack items="center" gap={13} flex={1}>
                    {Icon ? <Icon size={20} color="color-11" /> : null}
                    <Paragraph>{item.title}</Paragraph>
                    <UnreadDot />
                  </XStack>
                  <Icons.Disclosure size={16} color="color-8" />
                </XStack>
              )
            }
            return (
              <NavigationRow
                key={item.id}
                label={item.title}
                icon={item.icon}
                onPress={() => router.push(href)}
                testID={testID}
              />
            )
          })}
        </Section>
      ))}
    </Form>
  )
}
