import { Link } from 'one'
import { Pressable, Text, View } from 'react-native'
import Animated from 'react-native-reanimated'
import { photos } from '../../components/sharedElementPhotos'

// reanimated 4.7 shared element transitions across one's native stack. the
// thumbnail and the detail hero share a sharedTransitionTag, so a push morphs
// one into the other on the new layout animation engine.
export default function SharedElementGallery() {
  return (
    <View testID="shared-element-gallery" style={{ flex: 1, padding: 16, gap: 16 }}>
      {photos.map((photo) => (
        <Link key={photo.id} href={`/shared-element/${photo.id}`} asChild>
          <Pressable testID={`shared-element-open-${photo.id}`} style={{ flexDirection: 'row', gap: 12 }}>
            <Animated.Image
              source={photo.source}
              sharedTransitionTag={`photo-${photo.id}`}
              style={{ width: 96, height: 96, borderRadius: 12 }}
            />
            <Text style={{ fontSize: 17, alignSelf: 'center' }}>{photo.title}</Text>
          </Pressable>
        </Link>
      ))}
    </View>
  )
}
