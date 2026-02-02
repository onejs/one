import { Slot, Link } from 'one'
import type { ReactNode } from 'react'
import { YStack, XStack, Text } from 'tamagui'
import { ArrowLeft } from '@tamagui/lucide-icons'

/**
 * Account settings layout with @modal slot.
 *
 * The @modal/(..)profile route intercepts /settings/profile
 * when navigating from within /settings/account.
 *
 * Slot props are passed directly as component props (like Next.js parallel routes).
 */
export default function AccountLayout({ modal }: { modal?: ReactNode }) {
  return (
    <YStack flex={1}>
      <XStack
        p="$3"
        gap="$3"
        items="center"
        bg="$color3"
        borderColor="$borderColor"
        borderBottomWidth={1}
      >
        <Link href="/settings">
          <XStack items="center" gap="$2">
            <ArrowLeft size={16} color="$blue10" />
            <Text color="$blue10" fontSize="$3">
              Back to Settings
            </Text>
          </XStack>
        </Link>
        <Text fontSize="$4" fontWeight="600">
          Account Settings
        </Text>
      </XStack>

      <Slot />

      {/* Modal slot - renders intercepted routes */}
      {modal}
    </YStack>
  )
}
