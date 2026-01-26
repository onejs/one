import { useParams, Link } from 'one'
import { YStack, XStack, Text, Image, Button } from 'tamagui'
import { ArrowLeft } from '@tamagui/lucide-icons'

const getPhotoUrl = (id: string) =>
  `https://picsum.photos/id/${(parseInt(id) || 1) * 10}/600/400`

/**
 * Photo detail page - the "masked" URL destination.
 *
 * When route masking is used:
 * - Navigate to /photos/3/modal → URL shows /photos/3
 * - On refresh with unmaskOnReload: false → RouteMaskRestorer in _layout handles navigation
 * - On refresh with unmaskOnReload: true OR shared link → shows this page
 */
export default function PhotoDetail() {
  const { id = '1' } = useParams<{ id: string }>()

  const photo = {
    id,
    title: `Photo ${id}`,
    url: getPhotoUrl(id),
  }

  return (
    <YStack flex={1} bg="$background" p="$4" gap="$4" testID="photo-detail-page">
      <XStack items="center" gap="$3">
        <Link href="/photos">
          <Button size="$3" icon={ArrowLeft} circular testID="back-btn" />
        </Link>
        <Text fontSize="$6" fontWeight="bold" testID="photo-detail-title">
          {photo.title}
        </Text>
      </XStack>

      <Image
        source={{ uri: photo.url, width: 600, height: 400 }}
        width="100%"
        maxW={600}
        height={400}
        rounded="$4"
        self="center"
      />

      <YStack gap="$2" p="$3" bg="$color2" rounded="$4">
        <Text color="$color11" fontSize="$3">
          This is the photo detail page at /photos/{id}
        </Text>
        <Text color="$color11" fontSize="$3">
          You're seeing this because either:
        </Text>
        <Text color="$color11" fontSize="$3">
          • You navigated directly to this URL (shared link)
        </Text>
        <Text color="$color11" fontSize="$3">
          • unmaskOnReload was set to true
        </Text>
        <Link href={`/photos/${id}/modal` as any} testID="open-modal-link">
          <Text color="$blue10" fontSize="$3" textDecorationLine="underline">
            Open in modal
          </Text>
        </Link>
      </YStack>
    </YStack>
  )
}
