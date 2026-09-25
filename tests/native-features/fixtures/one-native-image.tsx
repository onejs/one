import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

// exercises One.UI.Image load reporting: a reachable remote image must fire
// onLoad with its pixel size, and an unreachable one must fire onError.
// results travel as labels like the other fixtures.
export default function OneNativeImage() {
  const [remote, setRemote] = useState('pending')
  const [broken, setBroken] = useState('pending')
  return (
    <View style={styles.screen}>
      <One.UI.Image
        source="https://picsum.photos/seed/one-native-image/120/80"
        resizeMode="cover"
        style={styles.image}
        onLoad={({ nativeEvent }) =>
          setRemote(`loaded ${nativeEvent.source.width}x${nativeEvent.source.height}`)
        }
        onError={({ nativeEvent }) => setRemote(`error ${nativeEvent.error}`)}
      />
      <Text>{`Remote: ${remote}`}</Text>
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
})
