import { Slot, Link } from 'one'
import { YStack, XStack, Text } from 'tamagui'

/**
 * Settings section layout.
 * This wraps all settings pages: /settings, /settings/account, /settings/profile
 */
export default function SettingsLayout() {
  return (
    <YStack flex={1} bg="$background">
      <XStack
        p="$3"
        gap="$3"
        items="center"
        bg="$color2"
        borderColor="$borderColor"
        borderWidth={1}
      >
        <Link href="/" asChild>
          <Text color="$blue10" fontSize="$4">
            Home
          </Text>
        </Link>
        <Text fontSize="$5" fontWeight="bold">
          Settings ((..) Intercept Demo)
        </Text>
      </XStack>

      <Slot />
    </YStack>
  )
}
