import { useState } from 'react'
import { Image, Pressable, Text, View } from 'react-native'
import { One } from 'one'

const image = Image.resolveAssetSource(
  require('../../../apps/onestack.dev/public/pokai.jpg')
).uri
const video = Image.resolveAssetSource(require('../assets/one-native-media.mp4')).uri
const document = Image.resolveAssetSource(require('../assets/one-native-preview.txt')).uri
const items = [
  { url: image, title: 'Pokai.jpg' },
  { url: video, title: 'Ocean.mp4' },
  { url: document, title: 'Notes.txt' },
]

export default function MediaViewerFixture() {
  const [error, setError] = useState('none')
  const [mounted, setMounted] = useState(true)
  return (
    <View style={{ flex: 1, padding: 20, gap: 20, backgroundColor: '#111827' }}>
      <Text style={{ color: 'white', fontSize: 26 }}>Media viewer</Text>
      <Text style={{ color: 'white' }} testID="media-viewer-error">
        Error: {error}
      </Text>
      <Pressable testID="media-viewer-toggle" onPress={() => setMounted(!mounted)}>
        <Text style={{ color: '#9ac7ff' }}>
          {mounted ? 'Unmount gallery' : 'Mount gallery'}
        </Text>
      </Pressable>
      {mounted && (
        <One.iOS.MediaViewer items={items} onError={setError}>
          <One.iOS.MediaViewer.Thumbnail
            index={0}
            testID="media-viewer-photo"
            accessibilityLabel="Open Pokai.jpg"
          >
            <Image
              source={{ uri: image }}
              style={{ width: '100%', height: 240, borderRadius: 20 }}
              resizeMode="cover"
            />
          </One.iOS.MediaViewer.Thumbnail>
          <One.iOS.MediaViewer.Thumbnail
            index={1}
            testID="media-viewer-video"
            accessibilityLabel="Open Ocean.mp4"
          >
            <Text
              style={{
                padding: 24,
                color: 'white',
                backgroundColor: '#243348',
                borderRadius: 16,
              }}
            >
              Ocean.mp4
            </Text>
          </One.iOS.MediaViewer.Thumbnail>
          <One.iOS.MediaViewer.Thumbnail
            index={2}
            testID="media-viewer-document"
            accessibilityLabel="Open Notes.txt"
          >
            <Text
              style={{
                padding: 24,
                color: 'white',
                backgroundColor: '#243348',
                borderRadius: 16,
              }}
            >
              Notes.txt
            </Text>
          </One.iOS.MediaViewer.Thumbnail>
        </One.iOS.MediaViewer>
      )}
      <One.iOS.MediaViewer
        items={[{ url: 'file:///missing-preview.jpg', title: 'Missing.jpg' }]}
        onError={setError}
      >
        <One.iOS.MediaViewer.Thumbnail index={0} testID="media-viewer-missing">
          <Text style={{ color: '#9ac7ff' }}>Open missing file</Text>
        </One.iOS.MediaViewer.Thumbnail>
      </One.iOS.MediaViewer>
    </View>
  )
}
