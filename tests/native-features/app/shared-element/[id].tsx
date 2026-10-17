import { useIsFocused, useParams } from 'one'
import { Text, View } from 'react-native'
import Animated, { SharedTransitionBoundary } from 'react-native-reanimated'
import { photos } from '../../components/sharedElementPhotos'

export default function SharedElementDetail() {
  const { id } = useParams<{ id: string }>()
  const photo = photos.find((item) => item.id === id) ?? photos[0]
  const isFocused = useIsFocused()
  return (
    <SharedTransitionBoundary isActive={isFocused}>
      <View testID="shared-element-detail" style={{ flex: 1 }}>
        <Animated.Image
          source={photo.source}
          sharedTransitionTag={`photo-${photo.id}`}
          style={{ width: '100%', height: 320 }}
        />
        <Text
          testID="shared-element-detail-title"
          style={{ fontSize: 28, fontWeight: '600', padding: 16 }}
        >
          {photo.title}
        </Text>
      </View>
    </SharedTransitionBoundary>
  )
}
