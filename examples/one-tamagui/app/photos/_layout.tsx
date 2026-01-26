import { Link, Slot } from 'one'
import { XStack, YStack, Text, Image, ScrollView, View } from 'tamagui'

const getPhotoUrl = (id: number, size: number) =>
  `https://picsum.photos/id/${id * 10}/${size}/${size}`

const photos = Array.from({ length: 12 }, (_, i) => ({
  id: String(i + 1),
  title: `Photo ${i + 1}`,
  url: getPhotoUrl(i + 1, 400),
  thumbnailUrl: getPhotoUrl(i + 1, 200),
}))

export default function PhotosLayout() {
  return (
    <YStack flex={1} bg="$background" testID="photos-layout">
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
          Photos
        </Text>
      </XStack>

      <ScrollView flex={1}>
        <XStack flexWrap="wrap" p="$2" gap="$3" justify="center">
          {photos.map((photo) => (
            <Link key={photo.id} href={`/photos/${photo.id}/modal` as any}>
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

      {/* Modal renders here as overlay */}
      <View position="absolute" t={0} l={0} r={0} b={0} pointerEvents="box-none">
        <Slot />
      </View>
    </YStack>
  )
}
