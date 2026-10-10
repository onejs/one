import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

type PlaceName = 'Ferry' | 'Presidio'
const placeNames: PlaceName[] = ['Ferry', 'Presidio']
const places: Record<PlaceName, { latitude: number; longitude: number }> = {
  Ferry: { latitude: 37.7955, longitude: -122.3937 },
  Presidio: { latitude: 37.7989, longitude: -122.4662 },
}
const zooms: number[] = [12, 10, 14]
const pins = [
  {
    id: 'coit',
    title: 'Coit Tower',
    tintColor: '#ff00ff',
    coordinates: { latitude: 37.8024, longitude: -122.4058 },
  },
  {
    id: 'ballpark',
    title: 'Ballpark',
    coordinates: { latitude: 37.7786, longitude: -122.3893 },
  },
  {
    id: 'pyramid',
    title: 'Pyramid',
    coordinates: { latitude: 37.7952, longitude: -122.4028 },
  },
  {
    id: 'ferry',
    title: 'Ferry Landing',
    coordinates: { latitude: 37.7955, longitude: -122.3937 },
  },
]
const ferryLine = [
  { latitude: 37.7885, longitude: -122.4007 },
  { latitude: 37.7935, longitude: -122.3957 },
  { latitude: 37.7985, longitude: -122.3907 },
  { latitude: 37.8025, longitude: -122.3867 },
]
const plazaQuad = [
  { latitude: 37.7875, longitude: -122.4017 },
  { latitude: 37.7875, longitude: -122.3857 },
  { latitude: 37.8035, longitude: -122.3857 },
  { latitude: 37.8035, longitude: -122.4017 },
]
const radiusCenter = { latitude: 37.7935, longitude: -122.3907 }

export default function OneNativeUiMap() {
  const [place, setPlace] = useState<PlaceName>('Ferry')
  const [zoomIndex, setZoomIndex] = useState(0)
  const [pinCount, setPinCount] = useState(2)
  const [showOverlays, setShowOverlays] = useState(true)
  const [tall, setTall] = useState(false)
  const [moves, setMoves] = useState(0)
  const [camera, setCamera] = useState('none')
  const [markerTap, setMarkerTap] = useState('none')
  const [mapTap, setMapTap] = useState('none')
  const current = places[place]
  const zoom = zooms[zoomIndex] ?? 12

  const status: [string, string | number][] = [
    ['Place', place],
    ['Zoom', zoom],
    ['Pins', pinCount],
    ['Overlays', showOverlays ? 'on' : 'off'],
    ['Moves', moves],
    ['Camera', camera],
    ['MarkerTap', markerTap],
    ['MapTap', mapTap],
    ['Height', tall ? 320 : 220],
  ]

  return (
    <View style={styles.screen} testID="one-native-ui-map-screen">
      <View style={styles.row}>
        {placeNames.map((item) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: place === item }}
            key={item}
            style={[styles.action, place === item && styles.selected]}
            testID={`one-native-ui-map-place-${item.toLowerCase()}`}
            onPress={() => setPlace(item)}
          >
            <Text style={styles.actionText}>{item}</Text>
          </Pressable>
        ))}
        <Pressable
          accessibilityRole="button"
          style={styles.action}
          testID="one-native-ui-map-zoom"
          onPress={() => setZoomIndex((index) => (index + 1) % zooms.length)}
        >
          <Text style={styles.actionText}>Cycle zoom</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={styles.action}
          testID="one-native-ui-map-pins"
          onPress={() => setPinCount((count) => (count + 1) % (pins.length + 1))}
        >
          <Text style={styles.actionText}>Cycle pins</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={styles.action}
          testID="one-native-ui-map-overlays"
          onPress={() => setShowOverlays((value) => !value)}
        >
          <Text style={styles.actionText}>Toggle overlays</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={styles.action}
          testID="one-native-ui-map-height"
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
            testID={`one-native-ui-map-${label.toLowerCase()}`}
          >{`${label}: ${value}`}</Text>
        ))}
      </View>
      <One.UI.Map
        cameraPosition={{ coordinates: current, zoom }}
        markers={pins.slice(0, pinCount)}
        polylines={
          showOverlays
            ? [{ id: 'embarcadero', coordinates: ferryLine, color: '#00ffff', width: 6 }]
            : []
        }
        polygons={
          showOverlays
            ? [
                {
                  id: 'plaza',
                  coordinates: plazaQuad,
                  color: '#ff8800',
                  lineColor: '#000000',
                  lineWidth: 2,
                },
              ]
            : []
        }
        circles={
          showOverlays
            ? [
                {
                  id: 'radius',
                  center: radiusCenter,
                  radius: 800,
                  color: '#ff880055',
                  lineColor: '#ff8800',
                  lineWidth: 3,
                },
              ]
            : []
        }
        style={[styles.map, { height: tall ? 320 : 220 }]}
        testID="one-native-ui-map-view"
        onCameraMove={(event) => {
          setMoves((count) => count + 1)
          setCamera(
            `${event.coordinates.latitude.toFixed(4)},${event.coordinates.longitude.toFixed(4)},${event.zoom.toFixed(1)}`
          )
        }}
        onMarkerClick={(marker) => setMarkerTap(marker.id)}
        onMapClick={(event) =>
          setMapTap(
            `${event.coordinates.latitude.toFixed(4)},${event.coordinates.longitude.toFixed(4)}`
          )
        }
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
  // a fill control reports no ideal height, so Yoga's box is its size.
  map: { marginTop: 8 },
})
