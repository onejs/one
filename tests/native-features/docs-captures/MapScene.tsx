import { One } from 'one'
import { Text, View } from 'react-native'

const ferry = { latitude: 37.7955, longitude: -122.3937 }
const markers = [
  { id: 'ferry', title: 'Ferry Building', coordinates: ferry, tintColor: '#ef4444' },
  {
    id: 'ballpark',
    title: 'Ballpark',
    coordinates: { latitude: 37.7786, longitude: -122.3893 },
  },
]
const walk = [
  ferry,
  { latitude: 37.7935, longitude: -122.3967 },
  { latitude: 37.7882, longitude: -122.3915 },
  { latitude: 37.7835, longitude: -122.3884 },
  { latitude: 37.7786, longitude: -122.3893 },
]

// a real map with markers, a route, and a radius, under a place card that leaves
// the map's legal attribution at the bottom visible.
export function MapScene() {
  return (
    <View
      style={{
        width: 300,
        height: 420,
        borderRadius: 44,
        borderCurve: 'continuous',
        overflow: 'hidden',
        backgroundColor: 'white',
      }}
    >
      <One.UI.Map
        style={{ flex: 1 }}
        cameraPosition={{ coordinates: { latitude: 37.791, longitude: -122.3955 }, zoom: 13.6 }}
        markers={markers}
        polylines={[{ id: 'walk', coordinates: walk, color: '#2563eb', width: 5 }]}
        circles={[
          {
            id: 'near',
            center: ferry,
            radius: 350,
            color: '#ef444433',
            lineColor: '#ef4444',
            lineWidth: 2,
          },
        ]}
      />
      <View
        style={{
          position: 'absolute',
          left: 14,
          right: 14,
          top: 14,
          borderRadius: 30,
          borderCurve: 'continuous',
          backgroundColor: 'white',
          padding: 16,
          paddingHorizontal: 20,
          gap: 2,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: '700' }}>Ferry Building</Text>
        <Text style={{ fontSize: 14, color: '#64748b' }}>24 min walk to the ballpark</Text>
      </View>
    </View>
  )
}
