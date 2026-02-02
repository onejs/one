import { Link } from 'one'
import { YStack, XStack, Text, Button, Image } from 'tamagui'
import { ArrowLeft } from '@tamagui/lucide-icons'

/**
 * Profile page - full page version.
 *
 * With intercepting routes:
 * - From /settings/account, clicking profile link → (..)profile intercepts, shows modal
 * - Direct navigation to /settings/profile → This full page renders
 */
export default function ProfilePage() {
  return (
    <YStack flex={1} p="$4" gap="$4" testID="profile-full-page">
      <XStack items="center" gap="$3">
        <Link href="/settings">
          <Button size="$3" icon={ArrowLeft} circular />
        </Link>
        <Text fontSize="$6" fontWeight="bold">
          Profile (Full Page)
        </Text>
      </XStack>

      <YStack items="center" gap="$4" p="$4">
        <Image
          source={{ uri: 'https://picsum.photos/200/200', width: 200, height: 200 }}
          width={120}
          height={120}
          rounded={60}
        />
        <Text fontSize="$5" fontWeight="600">
          John Doe
        </Text>
        <Text color="$color11">john.doe@example.com</Text>
      </YStack>

      <YStack gap="$2" p="$3" bg="$color2" rounded="$4">
        <Text color="$color11" fontSize="$3">
          This is the full profile page at /settings/profile
        </Text>
        <Text color="$color11" fontSize="$3">
          You're seeing this because you navigated directly to this URL.
        </Text>
        <Text color="$color11" fontSize="$3">
          Go to Account Settings and click "Edit Profile" to see the modal intercept.
        </Text>
      </YStack>
    </YStack>
  )
}
