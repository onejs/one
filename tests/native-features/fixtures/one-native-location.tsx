import { useEffect, useRef, useState } from 'react'
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

export default function OneNativeLocation() {
  const [permission, setPermission] = useState(() => One.Location.getPermissionStatus())
  const [position, setPosition] = useState('none')
  const [concurrent, setConcurrent] = useState('none')
  const [watch, setWatch] = useState('none')
  const [backgroundWatch, setBackgroundWatch] = useState('none')
  const [forward, setForward] = useState('none')
  const [reverse, setReverse] = useState('none')
  const stopWatch = useRef<(() => void) | null>(null)
  const stopBackgroundWatch = useRef<(() => void) | null>(null)

  useEffect(
    () => () => {
      stopWatch.current?.()
      stopBackgroundWatch.current?.()
    },
    []
  )

  return (
    <View style={styles.screen}>
      <Text testID="one-native-location-permission">Permission: {permission}</Text>
      <Text testID="one-native-location-position">Position: {position}</Text>
      <Text testID="one-native-location-concurrent">Concurrent: {concurrent}</Text>
      <Text testID="one-native-location-watch-value">Watch: {watch}</Text>
      <Text testID="one-native-location-background-value">
        Background watch: {backgroundWatch}
      </Text>
      <Text testID="one-native-location-forward-value">Forward: {forward}</Text>
      <Text testID="one-native-location-reverse-value">Reverse: {reverse}</Text>
      <Pressable
        testID="one-native-location-refresh"
        style={styles.chip}
        onPress={() => setPermission(One.Location.getPermissionStatus())}
      >
        <Text>Refresh location permission</Text>
      </Pressable>
      <Pressable
        testID="one-native-location-request"
        style={styles.chip}
        onPress={() => {
          const first = One.Location.requestWhenInUsePermission()
          const second = One.Location.requestWhenInUsePermission()
          Promise.all([first, second]).then(
            ([a, b]) => {
              setPermission(a)
              setConcurrent(`${a},${b}`)
            },
            (error) => setConcurrent(`error: ${error.code ?? 'unknown'}`)
          )
        }}
      >
        <Text>Request location permission</Text>
      </Pressable>
      <Pressable
        testID="one-native-location-current"
        style={styles.chip}
        onPress={() =>
          One.Location.getCurrentPosition().then(
            (next) =>
              setPosition(`${next.latitude.toFixed(4)},${next.longitude.toFixed(4)}`),
            (error) => setPosition(`error: ${error.code ?? 'unknown'}`)
          )
        }
      >
        <Text>Get current position</Text>
      </Pressable>
      <Pressable
        testID="one-native-location-watch"
        style={styles.chip}
        onPress={() => {
          stopWatch.current?.()
          setWatch('starting')
          stopWatch.current = One.Location.watchPosition(
            (next) =>
              setWatch(`${next.latitude.toFixed(4)},${next.longitude.toFixed(4)}`),
            (error) => setWatch(`error: ${error.code} ${error.message}`)
          )
        }}
      >
        <Text>Watch position</Text>
      </Pressable>
      <Pressable
        testID="one-native-location-stop-watch"
        style={styles.chip}
        onPress={() => {
          stopWatch.current?.()
          stopWatch.current = null
          setWatch('stopped')
        }}
      >
        <Text>Stop watching</Text>
      </Pressable>
      <Pressable
        testID="one-native-location-background-watch"
        style={styles.chip}
        onPress={async () => {
          stopBackgroundWatch.current?.()
          setBackgroundWatch('starting')
          const proofFile =
            One.FileSystem.getDirectories().documents +
            'one-native-location-background-proof.txt'
          await One.FileSystem.writeFile(proofFile, 'starting')
          stopBackgroundWatch.current = One.Location.watchPosition(
            (next) => {
              const value = `${AppState.currentState}:${next.latitude.toFixed(4)},${next.longitude.toFixed(4)}`
              if (AppState.currentState === 'background') {
                void One.FileSystem.writeFile(proofFile, value)
              }
              setBackgroundWatch((previous) =>
                AppState.currentState === 'background'
                  ? value
                  : previous.startsWith('background:')
                    ? previous
                    : value
              )
            },
            (error) => setBackgroundWatch(`error: ${error.code}`),
            { background: true }
          )
        }}
      >
        <Text>Watch in background</Text>
      </Pressable>
      <Pressable
        testID="one-native-location-stop-background-watch"
        style={styles.chip}
        onPress={() => {
          stopBackgroundWatch.current?.()
          stopBackgroundWatch.current = null
          setBackgroundWatch('stopped')
        }}
      >
        <Text>Stop background watch</Text>
      </Pressable>
      <Pressable
        testID="one-native-location-forward"
        style={styles.chip}
        onPress={() =>
          One.Location.geocodeAddress('Cupertino, California').then(
            (places) =>
              setForward(
                `${places.length}:${places[0]?.latitude.toFixed(2)},${places[0]?.longitude.toFixed(2)}`
              ),
            (error) => setForward(`error: ${error.code ?? 'unknown'}`)
          )
        }
      >
        <Text>Geocode Cupertino</Text>
      </Pressable>
      <Pressable
        testID="one-native-location-reverse"
        style={styles.chip}
        onPress={() =>
          One.Location.reverseGeocode(37.7749, -122.4194).then(
            (places) => setReverse(places[0]?.city ?? `count: ${places.length}`),
            (error) => setReverse(`error: ${error.code ?? 'unknown'}`)
          )
        }
      >
        <Text>Reverse geocode San Francisco</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 12 },
  chip: { padding: 12, backgroundColor: '#eee', borderRadius: 8 },
})
