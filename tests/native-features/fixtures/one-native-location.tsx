import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

export default function OneNativeLocation() {
  const [permission, setPermission] = useState(() => One.iOS.Location.getPermissionStatus())
  const [position, setPosition] = useState('none')
  const [concurrent, setConcurrent] = useState('none')

  return (
    <View style={styles.screen}>
      <Text testID="one-native-location-permission">Permission: {permission}</Text>
      <Text testID="one-native-location-position">Position: {position}</Text>
      <Text testID="one-native-location-concurrent">Concurrent: {concurrent}</Text>
      <Pressable
        testID="one-native-location-refresh"
        style={styles.chip}
        onPress={() => setPermission(One.iOS.Location.getPermissionStatus())}
      >
        <Text>Refresh location permission</Text>
      </Pressable>
      <Pressable
        testID="one-native-location-request"
        style={styles.chip}
        onPress={() => {
          const first = One.iOS.Location.requestWhenInUsePermission()
          const second = One.iOS.Location.requestWhenInUsePermission()
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
          One.iOS.Location.getCurrentPosition().then(
            (next) =>
              setPosition(`${next.latitude.toFixed(4)},${next.longitude.toFixed(4)}`),
            (error) => setPosition(`error: ${error.code ?? 'unknown'}`)
          )
        }
      >
        <Text>Get current position</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 12 },
  chip: { padding: 12, backgroundColor: '#eee', borderRadius: 8 },
})
