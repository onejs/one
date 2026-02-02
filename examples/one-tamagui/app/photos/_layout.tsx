import { Slot } from 'one'
import { YStack, XStack, Text } from 'tamagui'
import { Link } from 'one'

/**
 * Photos section layout.
 *
 * This layout wraps both:
 * - /photos (index.tsx - the grid)
 * - /photos/[id] (detail page on hard navigation)
 *
 * The @modal/(.)photos/[id] intercept route is at the ROOT layout level,
 * so it renders as an overlay on soft navigation.
 */
export default function PhotosLayout() {
  return (
    <YStack flex={1} bg="$background" testID="photos-layout" mt={50}>
      <XStack
        p="$3"
        gap="$3"
        items="center"
        bg="$color2"
        borderColor="$borderColor"
        borderWidth={1}
      >
        <Link href="/">
          <Text color="$blue10" fontSize="$4">
            Home
          </Text>
        </Link>
        <Text fontSize="$5" fontWeight="bold" testID="photos-title">
          Photos (Intercepting Routes Demo)
        </Text>
      </XStack>

      {/* Slot renders the matched child route: index.tsx OR [id]/index.tsx */}
      <Slot />
    </YStack>
  )
}
