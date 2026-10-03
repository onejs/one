import {
  Form,
  NavigationRow,
  Section,
  SubmitButton,
  ToggleField,
} from '~/interface/ui/forms/Form'
import { One, useRouter } from 'one'
import { APP_NAME_LOWERCASE, DOMAIN } from '~/constants'
import { useSettingsData } from '~/features/settings/useSettingsData'

// settings is a grouped Form under the stack's own navigation bar. every row
// kind reaches the shared Form pattern except the unread-dot row, which stays
// on One.iOS directly: a custom row label is something the narrow contract
// cannot express and should not pretend to.
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
                  systemImage={item.systemImage}
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
                  systemImage={item.systemImage}
                  onPress={() => One.openURL(`https://${DOMAIN}${item.href}`)}
                  testID={testID}
                />
              )
            }
            const href = item.href
            // an unread mark rides a custom label: title plus the dot, never
            // a count to reconcile. NavigationRow takes a plain label, so this
            // one row is a raw One.iOS Button inside the shared Section,
            // which is a SwiftUI Section and composes with one.
            if (item.showsUnreadDot) {
              return (
                <One.iOS.Button
                  key={item.id}
                  onPress={() => router.push(href)}
                  testID={testID}
                >
                  <One.iOS.HStack alignment="center" spacing={8}>
                    <One.iOS.Text text={item.title} />
                    <One.iOS.Spacer />
                    <One.iOS.Circle fill="#FF3B30" swiftStyle={{ width: 8, height: 8 }} />
                  </One.iOS.HStack>
                </One.iOS.Button>
              )
            }
            return (
              <NavigationRow
                key={item.id}
                label={item.title}
                systemImage={item.systemImage}
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
