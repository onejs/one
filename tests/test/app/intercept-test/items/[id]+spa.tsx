import { useParams, Link } from 'one'
import { YStack, XStack, Text, Button } from 'tamagui'

/**
 * Full page item detail - renders on hard navigation (direct URL, refresh).
 * With intercepting routes, soft navigation shows the modal instead.
 */
export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <YStack p="$4" gap="$4" testID="item-detail-page">
      <XStack gap="$3" ai="center">
        <Link href="/intercept-test" asChild>
          <Button size="$3" testID="back-to-list">Back</Button>
        </Link>
        <Text fontSize="$6" fontWeight="bold" testID="item-title">
          Item {id} (Full Page)
        </Text>
      </XStack>

      <YStack p="$4" bg="$color2" borderRadius="$4" gap="$2">
        <Text testID="full-page-indicator">
          This is the FULL PAGE version at /intercept-test/items/{id}
        </Text>
        <Text color="$color11">
          You're seeing this because you navigated directly to this URL (hard navigation).
        </Text>
        <Text color="$color11">
          Click an item from the list to see the intercepting modal instead.
        </Text>
      </YStack>
    </YStack>
  )
}
