import { Link } from 'one'
import { YStack, Text } from 'tamagui'

/**
 * Intercept test index page - shows a list of items.
 * Clicking an item should trigger the intercepting route (modal).
 */
export default function InterceptTestIndex() {
  return (
    <YStack p="$4" gap="$3" testID="intercept-test-index">
      <Text fontSize="$5" fontWeight="bold">Items List</Text>
      <Text color="$color11" testID="intercept-index-info">
        Click an item to open it in a modal (intercepting route).
      </Text>

      <YStack gap="$2" mt="$3">
        {[1, 2, 3].map((id) => (
          <Link key={id} href={`/intercept-test/items/${id}`} asChild>
            <YStack
              p="$3"
              bg="$color2"
              borderRadius="$3"
              hoverStyle={{ bg: '$color3' }}
              testID={`item-link-${id}`}
            >
              <Text>Item {id}</Text>
            </YStack>
          </Link>
        ))}
      </YStack>
    </YStack>
  )
}
