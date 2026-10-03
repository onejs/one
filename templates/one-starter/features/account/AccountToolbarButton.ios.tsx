import { Stack, router } from 'one'
import { useTheme } from 'tamagui'
import { APP_SETTINGS_HREF } from '~/features/app/routes'

/**
 * @agent-rule
 * the permanent native settings entry: a trailing gear in the mounting tab
 * root's own navigation bar, pushing the settings stack (which holds
 * sign-out). every tab root renders this in its screen content; it lives
 * outside starter-retirement.json so retirement cannot remove it, and a new
 * product's tab roots mount it the same way.
 */
export function AccountToolbarButton({ onPress }: { onPress?: () => void }) {
  // the gear takes the brand tint, like the tab bar: accent-background is
  // the one token a product's theme always sets.
  const tint = useTheme()['accent-background']?.val
  return (
    <Stack.Toolbar placement="right">
      <Stack.Toolbar.Button
        icon="gearshape"
        tintColor={tint}
        accessibilityLabel="Settings"
        onPress={onPress ?? (() => router.push(APP_SETTINGS_HREF))}
      />
    </Stack.Toolbar>
  )
}
