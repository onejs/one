import { Link } from 'one'
import { YStack, XStack, Text, Button } from 'tamagui'
import { User, Mail, Bell, Shield } from '@tamagui/lucide-icons'

/**
 * Account settings page.
 * Contains a link to /settings/profile which will be intercepted
 * by the @modal/(..)profile route and shown as a modal.
 */
export default function AccountIndex() {
  return (
    <YStack flex={1} p="$4" gap="$4">
      <Text fontSize="$5" fontWeight="bold">
        Manage Your Account
      </Text>

      <YStack gap="$3">
        {/* This link will be intercepted by @modal/(..)profile */}
        <Link href="/settings/profile" asChild>
          <XStack
            p="$4"
            bg="$blue2"
            rounded="$4"
            items="center"
            gap="$3"
            borderWidth={2}
            borderColor="$blue6"
            hoverStyle={{ bg: '$blue3' }}
            pressStyle={{ scale: 0.98 }}
          >
            <User size={24} color="$blue10" />
            <YStack flex={1}>
              <Text fontSize="$4" fontWeight="600" color="$blue10">
                Edit Profile
              </Text>
              <Text color="$blue9" fontSize="$2">
                Click to open profile modal ((..) intercept)
              </Text>
            </YStack>
          </XStack>
        </Link>

        <XStack p="$4" bg="$color2" rounded="$4" items="center" gap="$3" opacity={0.6}>
          <Mail size={24} color="$color11" />
          <YStack>
            <Text fontSize="$4" fontWeight="600">
              Email Settings
            </Text>
            <Text color="$color11" fontSize="$2">
              (Demo placeholder)
            </Text>
          </YStack>
        </XStack>

        <XStack p="$4" bg="$color2" rounded="$4" items="center" gap="$3" opacity={0.6}>
          <Bell size={24} color="$color11" />
          <YStack>
            <Text fontSize="$4" fontWeight="600">
              Notifications
            </Text>
            <Text color="$color11" fontSize="$2">
              (Demo placeholder)
            </Text>
          </YStack>
        </XStack>

        <XStack p="$4" bg="$color2" rounded="$4" items="center" gap="$3" opacity={0.6}>
          <Shield size={24} color="$color11" />
          <YStack>
            <Text fontSize="$4" fontWeight="600">
              Security
            </Text>
            <Text color="$color11" fontSize="$2">
              (Demo placeholder)
            </Text>
          </YStack>
        </XStack>
      </YStack>

      <YStack p="$3" bg="$yellow2" rounded="$4" mt="$2">
        <Text color="$yellow11" fontSize="$3">
          💡 The "Edit Profile" link goes to /settings/profile but will be intercepted by
          @modal/(..)profile and shown as a modal overlay.
        </Text>
      </YStack>
    </YStack>
  )
}
