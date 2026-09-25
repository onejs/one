import { useEffect, useState } from 'react'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

const videoURL = Image.resolveAssetSource(require('../assets/one-native-media.mp4'))?.uri

// exercises One.UI.PictureInPicture: a js-driven clock and a sweeping bar
// inside the pip content prove the window keeps updating while the app is in
// the background, and the status rows record every transition the system
// reports, including the automatic start on backgrounding and the stop on
// return. the video content proves a player inside the window plays live.
export default function OneNativePip() {
  const [active, setActive] = useState(false)
  const [autoEnter, setAutoEnter] = useState(true)
  const [video, setVideo] = useState(false)
  const [changes, setChanges] = useState<string[]>([])
  const [start] = useState(() => Date.now())
  const [now, setNow] = useState(start)

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100)
    return () => clearInterval(id)
  }, [])

  const elapsed = (now - start) / 1000
  const sweep = (elapsed % 2) / 2

  return (
    <View style={styles.screen}>
      <One.UI.PictureInPicture
        testID="one-native-pip"
        style={styles.pip}
        active={active}
        autoEnter={autoEnter}
        onActiveChange={(next) => {
          setActive(next)
          setChanges((list) => [...list, next ? 'on' : 'off'])
        }}
      >
        {video && videoURL ? (
          <One.iOS.VideoPlayer url={videoURL} autoplay style={styles.video} />
        ) : (
          <>
            <Text style={styles.clock}>{elapsed.toFixed(1)}s</Text>
            <View style={styles.track}>
              <View style={[styles.bar, { left: `${sweep * 80}%` }]} />
            </View>
          </>
        )}
      </One.UI.PictureInPicture>
      <Text>{`Active: ${active ? 'yes' : 'no'}`}</Text>
      <Text>{`Changes: ${changes.join(',') || 'none'}`}</Text>
      <Text>{`Auto enter: ${autoEnter ? 'on' : 'off'}`}</Text>
      <Text>{`Content: ${video ? 'video' : 'clock'}`}</Text>
      <Pressable
        accessibilityRole="button"
        testID="one-native-pip-start"
        style={styles.chip}
        onPress={() => setActive(true)}
      >
        <Text>Start</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        testID="one-native-pip-stop"
        style={styles.chip}
        onPress={() => setActive(false)}
      >
        <Text>Stop</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        testID="one-native-pip-auto"
        style={styles.chip}
        onPress={() => setAutoEnter((value) => !value)}
      >
        <Text>Toggle auto enter</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        testID="one-native-pip-content"
        style={styles.chip}
        onPress={() => setVideo((value) => !value)}
      >
        <Text>Toggle video</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 8 },
  pip: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#12203a',
    borderRadius: 12,
    justifyContent: 'center',
    padding: 16,
    gap: 12,
  },
  clock: {
    color: 'white',
    fontSize: 44,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  track: { height: 12, borderRadius: 6, backgroundColor: '#2c3e63' },
  bar: {
    position: 'absolute',
    width: '20%',
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4fd1c5',
  },
  video: { flex: 1, margin: -16 },
  chip: { padding: 12, backgroundColor: '#eee', borderRadius: 8 },
})
