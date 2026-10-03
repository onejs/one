import { Stack, router } from 'one'
import { Pressable } from 'react-native'
import { useTheme } from 'tamagui'
import { APP_SETTINGS_HREF } from '~/features/app/routes'
import { Icons } from '~/interface/icons'

/**
 * @agent-rule
 * header item descriptors are ios-only, so the android gear rides a custom
 * header element instead of the ios leg's button descriptor. same entry,
 * same target: the settings stack, which holds sign-out.
 */
export function AccountToolbarButton({ onPress }: { onPress?: () => void }) {
  // the gear takes the brand tint, like the tab bar: accent-background is
  // the one token a product's theme always sets.
  const tint = useTheme()['accent-background']?.val
  return (
    <Stack.Toolbar placement="right" asChild>
      <Pressable
        onPress={onPress ?? (() => router.push(APP_SETTINGS_HREF))}
        accessibilityRole="button"
        accessibilityLabel="Settings"
        testID="account-button"
        hitSlop={8}
      >
        <Icons.Settings size={24} color={tint} />
      </Pressable>
    </Stack.Toolbar>
  )
}
