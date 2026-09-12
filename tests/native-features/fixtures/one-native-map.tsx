import { useState } from 'react'
import { Swift } from 'one-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'

const places = {
  Ferry: { label: 'Ferry Building', latitude: 37.7955, longitude: -122.3937 },
  Presidio: { label: 'Presidio', latitude: 37.7989, longitude: -122.4662 },
} as const
const pins = [
  { id: 'coit', label: 'Coit Tower', latitude: 37.8024, longitude: -122.4058 },
  { id: 'ballpark', label: 'Ballpark', latitude: 37.7786, longitude: -122.3893 },
  { id: 'pyramid', label: 'Pyramid', latitude: 37.7952, longitude: -122.4028 },
]

export default function OneNativeMap() {
  const [place, setPlace] = useState<keyof typeof places>('Ferry')
  const [pinCount, setPinCount] = useState(2)
  const [regions, setRegions] = useState(0)
  const [center, setCenter] = useState('none')
  const [tall, setTall] = useState(false)
  const current = places[place]

  const status: [string, string | number][] = [
    ['Place', place],
    ['Pins', pinCount],
    ['Regions', regions],
    ['Center', center],
    ['Height', tall ? 320 : 220],
  ]

  return (
    <View style={styles.screen} testID="one-native-map-screen">
      <View style={styles.row}>
        {(Object.keys(places) as (keyof typeof places)[]).map((item) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: place === item }}
            key={item}
            style={[styles.action, place === item && styles.selected]}
            testID={`one-native-map-place-${item.toLowerCase()}`}
            onPress={() => setPlace(item)}
          >
            <Text style={styles.actionText}>{item}</Text>
          </Pressable>
        ))}
        <Pressable
          accessibilityRole="button"
          style={styles.action}
          testID="one-native-map-pins"
          onPress={() => setPinCount((count) => (count + 1) % (pins.length + 1))}
        >
          <Text style={styles.actionText}>Cycle pins</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={styles.action}
          testID="one-native-map-height"
          onPress={() => setTall((value) => !value)}
        >
          <Text style={styles.actionText}>Toggle height</Text>
        </Pressable>
      </View>
      <View style={styles.status}>
        {status.map(([label, value]) => (
          <Text
            key={label}
            style={styles.statusText}
            testID={`one-native-map-${label.toLowerCase()}`}
          >{`${label}: ${value}`}</Text>
        ))}
      </View>
      <Swift.Map
        distance={4000}
        latitude={current.latitude}
        longitude={current.longitude}
        markers={pins.slice(0, pinCount)}
        style={[styles.map, { height: tall ? 320 : 220 }]}
        testID="one-native-map-view"
        onRegionChange={(latitude, longitude) => {
          setRegions((count) => count + 1)
          // rounding keeps the assertion about where the camera went rather than about
          // the exact float MapKit settled on.
          setCenter(`${latitude.toFixed(2)},${longitude.toFixed(2)}`)
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 10, paddingTop: 8, backgroundColor: '#F5F5F7' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
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
  // Map is a fill control: it reports no ideal height, so Yoga's box is its size.
  map: { marginTop: 8 },
})
