import { useState } from 'react'
import { Swift } from '@vxrn/native'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'

const categories = ['Player', 'Preview'] as const

const videoSource = Image.resolveAssetSource(require('../assets/one-native-media.mp4'))
const previewSource = Image.resolveAssetSource(
  require('../assets/one-native-preview.txt')
)
if (!videoSource || !previewSource)
  throw new Error('native media fixture assets did not resolve')
const videoURL = videoSource.uri
const previewURL = previewSource.uri

export default function OneNativeMedia() {
  const [category, setCategory] = useState<(typeof categories)[number]>('Player')
  const [autoplay, setAutoplay] = useState(false)
  const [tall, setTall] = useState(false)
  const [isPresented, setIsPresented] = useState(false)
  const [changes, setChanges] = useState(0)

  const handlePresentationChange = (value: boolean) => {
    setChanges((count) => count + 1)
    setIsPresented(value)
  }
  const status: [string, string | number][] = [
    ['Category', category],
    ['Sources', videoURL && previewURL ? 'ready' : 'missing'],
    ['Autoplay', autoplay ? 'on' : 'off'],
    ['Height', tall ? 320 : 220],
    ['Presented', String(isPresented)],
    ['Changes', changes],
  ]

  return (
    <View style={styles.screen} testID="one-native-media-screen">
      <View style={styles.row}>
        {categories.map((item) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: category === item }}
            key={item}
            style={[styles.action, category === item && styles.selected]}
            testID={`one-native-media-category-${item.toLowerCase()}`}
            onPress={() => {
              setCategory(item)
              setIsPresented(false)
              setChanges(0)
            }}
          >
            <Text style={styles.actionText}>{item}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.status}>
        {status.map(([label, value]) => (
          <Text
            key={label}
            style={styles.statusText}
            testID={`one-native-media-status-${label.toLowerCase().replace(' ', '-')}`}
          >{`${label}: ${value}`}</Text>
        ))}
      </View>
      {category === 'Player' ? (
        <>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              style={styles.action}
              testID="one-native-media-autoplay"
              onPress={() => setAutoplay((value) => !value)}
            >
              <Text style={styles.actionText}>Toggle autoplay</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={styles.action}
              testID="one-native-media-height"
              onPress={() => setTall((value) => !value)}
            >
              <Text style={styles.actionText}>Toggle height</Text>
            </Pressable>
          </View>
          <Swift.VideoPlayer
            autoplay={autoplay}
            style={[styles.video, { height: tall ? 320 : 220 }]}
            testID="one-native-media-video"
            url={videoURL}
          />
        </>
      ) : (
        <>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              style={styles.action}
              testID="one-native-media-open"
              onPress={() => handlePresentationChange(true)}
            >
              <Text style={styles.actionText}>Open preview</Text>
            </Pressable>
          </View>
          <Swift.QuickLook
            isPresented={isPresented}
            testID="one-native-media-quicklook"
            url={previewURL}
            onIsPresentedChange={handlePresentationChange}
          />
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 10, paddingTop: 8, backgroundColor: '#F5F5F7' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  actions: { marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  action: {
    minHeight: 34,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#E3E3E8',
  },
  selected: { backgroundColor: '#B7D5FF' },
  actionText: { color: '#17233A', fontSize: 12, fontWeight: '600' },
  status: { marginTop: 6, padding: 6, borderRadius: 8, backgroundColor: '#FFFFFF' },
  statusText: { color: '#17233A', fontSize: 11, fontVariant: ['tabular-nums'] },
  // VideoPlayer is a fill control: it has no ideal height to report, so it takes whatever
  // box Yoga gives it rather than sizing itself.
  video: { marginTop: 8 },
})
