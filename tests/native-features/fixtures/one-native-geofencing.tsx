import { useEffect, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

const REGION_ID = 'one-native-geofence'

export default function OneNativeGeofencing() {
  const [permission, setPermission] = useState(() => One.Location.getPermissionStatus())
  const [anchor, setAnchor] = useState('none')
  const [monitoring, setMonitoring] = useState('idle')
  const [monitored, setMonitored] = useState('Monitored: none')
  const [regionEvent, setRegionEvent] = useState('Event: none')
  const [regionState, setRegionState] = useState('State: none')
  const stopEnter = useRef<(() => void) | null>(null)
  const stopExit = useRef<(() => void) | null>(null)
  const lastCoordinate = useRef<{ latitude: number; longitude: number } | null>(null)

  useEffect(
    () => () => {
      stopEnter.current?.()
      stopExit.current?.()
      stopEnter.current = null
      stopExit.current = null
    },
    []
  )

  return (
    <View style={styles.screen}>
      <Text testID="one-native-geofencing-permission">Permission: {permission}</Text>
      <Text testID="one-native-geofencing-anchor-value">Anchor: {anchor}</Text>
      <Text testID="one-native-geofencing-value">Monitoring: {monitoring}</Text>
      <Text testID="one-native-geofencing-monitored-value">{monitored}</Text>
      <Text testID="one-native-geofencing-event-value">{regionEvent}</Text>
      <Text testID="one-native-geofencing-state-value">{regionState}</Text>
      <Pressable
        testID="one-native-geofencing-request"
        style={styles.chip}
        onPress={() => {
          const first = One.Location.requestWhenInUsePermission()
          const second = One.Location.requestWhenInUsePermission()
          Promise.all([first, second]).then(
            ([a, b]) => {
              setPermission(a)
              setMonitoring(`requested:${a},${b}`)
            },
            (error) => setMonitoring(`error: ${error.code ?? 'unknown'}`)
          )
        }}
      >
        <Text>Request location permission</Text>
      </Pressable>
      <Pressable
        testID="one-native-geofencing-anchor"
        style={styles.chip}
        onPress={() =>
          One.Location.getCurrentPosition().then(
            (next) => {
              lastCoordinate.current = {
                latitude: next.latitude,
                longitude: next.longitude,
              }
              setAnchor(`${next.latitude.toFixed(4)},${next.longitude.toFixed(4)}`)
            },
            (error) => setAnchor(`error: ${error.code ?? 'unknown'}`)
          )
        }
      >
        <Text>Anchor current position</Text>
      </Pressable>
      <Pressable
        testID="one-native-geofencing-subscribe"
        style={styles.chip}
        onPress={() => {
          stopEnter.current?.()
          stopExit.current?.()
          const entered = One.Location.addDidEnterRegionListener((region) =>
            setRegionEvent(`Event: didEnter:${region.identifier}`)
          )
          const exited = One.Location.addDidExitRegionListener((region) =>
            setRegionEvent(`Event: didExit:${region.identifier}`)
          )
          stopEnter.current = () => entered.remove()
          stopExit.current = () => exited.remove()
          setMonitoring('subscribed')
        }}
      >
        <Text>Subscribe region events</Text>
      </Pressable>
      <Pressable
        testID="one-native-geofencing-start"
        style={styles.chip}
        onPress={() => {
          const center = lastCoordinate.current ?? {
            latitude: 37.7749,
            longitude: -122.4194,
          }
          One.Location.startMonitoring({
            identifier: REGION_ID,
            center,
            radius: 200,
          }).then(
            () => {
              const regions = One.Location.monitoredRegions()
              setMonitored(`Monitored: ${regions.map((region) => region.identifier).join(',')}`)
              setMonitoring(`started:${regions.map((region) => region.identifier).join(',')}`)
            },
            (error) => setMonitoring(`error: ${error.code ?? 'unknown'}`)
          )
        }}
      >
        <Text>Start monitoring</Text>
      </Pressable>
      <Pressable
        testID="one-native-geofencing-state"
        style={styles.chip}
        onPress={() =>
          One.Location.requestState(REGION_ID).then(
            (state) => setRegionState(`State: ${state}`),
            (error) => setRegionState(`error: ${error.code ?? 'unknown'}`)
          )
        }
      >
        <Text>Request region state</Text>
      </Pressable>
      <Pressable
        testID="one-native-geofencing-stop"
        style={styles.chip}
        onPress={() =>
          One.Location.stopMonitoring(REGION_ID).then(
            () => {
              const regions = One.Location.monitoredRegions()
              setMonitored(regions.length === 0 ? 'Monitored: none' : `Monitored: ${regions.length}`)
              setMonitoring('stopped')
            },
            (error) => setMonitoring(`error: ${error.code ?? 'unknown'}`)
          )
        }
      >
        <Text>Stop monitoring</Text>
      </Pressable>
      <Pressable
        testID="one-native-geofencing-invalid"
        style={styles.chip}
        onPress={() => {
          try {
            void One.Location.startMonitoring({
              identifier: 'bad',
              center: { latitude: 37.7749, longitude: -122.4194 },
              radius: -1,
            })
            setMonitoring('accepted')
          } catch (error) {
            setMonitoring(`error: ${error instanceof Error ? error.message : 'unknown'}`)
          }
        }}
      >
        <Text>Start invalid region</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 12 },
  chip: { padding: 12, backgroundColor: '#eee', borderRadius: 8 },
})
