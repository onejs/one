import { Link } from 'one'
import { YStack, XStack, Text, Button } from 'tamagui'
import { User, Settings } from '@tamagui/lucide-icons'

/**
 * Settings home page.
 * Links to account and profile sections.
 */
export default function SettingsIndex() {
  return (
    <YStack flex={1} p="$4" gap="$4">
      <Text fontSize="$6" fontWeight="bold">
        Settings Home
      </Text>
      <Text color="$color11" fontSize="$4">
        This example tests the (..) intercepting route prefix.
      </Text>

      <YStack gap="$3" mt="$4">
        <Link href="/settings/account">
          <XStack
            p="$4"
            bg="$color2"
            rounded="$4"
            items="center"
            gap="$3"
            hoverStyle={{ bg: '$color3' }}
            pressStyle={{ scale: 0.98 }}
          >
            <Settings size={24} color="$color11" />
            <YStack>
              <Text fontSize="$5" fontWeight="600">
                Account Settings
              </Text>
              <Text color="$color11" fontSize="$3">
                Test (..) intercept from here
              </Text>
            </YStack>
          </XStack>
        </Link>

        <Link href="/settings/profile">
          <XStack
            p="$4"
            bg="$color2"
            rounded="$4"
            items="center"
            gap="$3"
            hoverStyle={{ bg: '$color3' }}
            pressStyle={{ scale: 0.98 }}
          >
            <User size={24} color="$color11" />
            <YStack>
              <Text fontSize="$5" fontWeight="600">
                Profile (Full Page)
              </Text>
              <Text color="$color11" fontSize="$3">
                Direct navigation - no intercept
              </Text>
            </YStack>
          </XStack>
        </Link>
      </YStack>
    </YStack>
  )
}
