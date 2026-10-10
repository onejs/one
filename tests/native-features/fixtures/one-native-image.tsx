import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

const remoteSources = [
  'https://picsum.photos/seed/one-native-image/120/80',
  'https://picsum.photos/seed/one-native-image/60/40',
]

// exercises One.UI.Image load reporting: a bundled asset and a reachable remote
// image must fire onLoad with their pixel size, a source change must load
// again, and an unreachable one must fire onError. results travel as labels
// like the other fixtures.
export default function OneNativeImage() {
  const [asset, setAsset] = useState('pending')
  const [remote, setRemote] = useState('pending')
  const [remoteLoads, setRemoteLoads] = useState(0)
  const [remoteIndex, setRemoteIndex] = useState(0)
  const [broken, setBroken] = useState('pending')
  return (
    <View testID="one-ui-image-screen" collapsable={false} style={styles.screen}>
      <One.UI.Image
        source={require('../assets/updates-v2.png')}
        resizeMode="contain"
        accessible
        accessibilityLabel="One UI Image asset"
        style={styles.image}
        onLoad={({ nativeEvent }) =>
          setAsset(`loaded ${nativeEvent.source.width}x${nativeEvent.source.height}`)
        }
        onError={({ nativeEvent }) => setAsset(`error ${nativeEvent.error}`)}
      />
      <Text>{`Asset: ${asset}`}</Text>
      <One.UI.Image
        source={remoteSources[remoteIndex]}
        resizeMode="cover"
        style={styles.image}
        onLoad={({ nativeEvent }) => {
          setRemoteLoads((count) => count + 1)
          setRemote(`loaded ${nativeEvent.source.width}x${nativeEvent.source.height}`)
        }}
        onError={({ nativeEvent }) => setRemote(`error ${nativeEvent.error}`)}
      />
      <Text>{`Remote: ${remote}`}</Text>
      <Text>{`Remote loads: ${remoteLoads}`}</Text>
      <Pressable
        testID="one-native-image-switch"
        accessibilityRole="button"
        style={styles.chip}
        onPress={() => setRemoteIndex((index) => (index + 1) % remoteSources.length)}
      >
        <Text>Switch source</Text>
      </Pressable>
      <One.UI.Image
        source={{ uri: 'https://one-native-image.invalid/missing.png' }}
        style={styles.image}
        onLoad={() => setBroken('loaded')}
        onError={() => setBroken('error')}
      />
      <Text>{`Broken: ${broken}`}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 12 },
  image: { width: 120, height: 80, backgroundColor: '#eee' },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#eee',
    alignSelf: 'flex-start',
  },
})
