import { Link } from 'one'
import { XStack, YStack, Text, Image, ScrollView } from 'tamagui'

const getPhotoUrl = (id: number, size: number) =>
  `https://picsum.photos/id/${id * 10}/${size}/${size}`

const photos = Array.from({ length: 12 }, (_, i) => ({
  id: String(i + 1),
  title: `Photo ${i + 1}`,
  url: getPhotoUrl(i + 1, 400),
  thumbnailUrl: getPhotoUrl(i + 1, 200),
}))

/**
 * Photos grid page.
 *
 * Using intercepting routes:
 * - Clicking a photo → Link navigates to /photos/[id]
 * - Soft navigation → @modal/(.)photos/[id] intercepts, shows modal over this grid
 * - Hard navigation (refresh/direct URL) → Full page at /photos/[id] renders
 */
export default function PhotosIndex() {
  return (
    <ScrollView flex={1}>
      <XStack flexWrap="wrap" p="$2" gap="$3" justify="center">
        {photos.map((photo) => (
          <Link key={photo.id} href={`/photos/${photo.id}`} asChild>
            <YStack
              width={180}
              bg="$color2"
              rounded="$4"
              overflow="hidden"
              elevation="$2"
              hoverStyle={{ scale: 1.05 }}
              pressStyle={{ scale: 0.98 }}
              animation="quick"
            >
              <Image
                source={{ uri: photo.thumbnailUrl, width: 180, height: 120 }}
                width={180}
                height={120}
              />
              <Text p="$2" fontSize="$3" fontWeight="500">
                {photo.title}
              </Text>
            </YStack>
          </Link>
        ))}
      </XStack>
    </ScrollView>
  )
}
