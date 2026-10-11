import { Component, useState, type ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

// the map's own controls, composed under the map so they operate on the owning
// map. toggles mount and unmount each control; regions only changes when the
// native side reports a finished pan, so it stays put while controls come and
// go. the invalid control stays unmounted until its pressable runs.
const pins = [
  { id: 'coit', label: 'Coit Tower', latitude: 37.8024, longitude: -122.4058 },
  { id: 'ballpark', label: 'Ballpark', latitude: 37.7786, longitude: -122.3893 },
]

export default function OneNativeMapControls() {
  const [compass, setCompass] = useState(true)
  const [pitch, setPitch] = useState(true)
  const [user, setUser] = useState(false)
  const [regions, setRegions] = useState(0)
  const [center, setCenter] = useState('none')
  const [invalid, setInvalid] = useState(false)

  const names = [
    compass && 'compass',
    pitch && 'pitch',
    user && 'user',
  ].filter(Boolean)

  return (
    <View style={styles.screen} testID="one-native-map-controls-screen">
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          style={styles.action}
          testID="one-native-map-controls-toggle-compass"
          onPress={() => setCompass((value) => !value)}
        >
          <Text style={styles.actionText}>Toggle compass</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={styles.action}
          testID="one-native-map-controls-toggle-pitch"
          onPress={() => setPitch((value) => !value)}
        >
          <Text style={styles.actionText}>Toggle pitch</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={styles.action}
          testID="one-native-map-controls-toggle-user"
          onPress={() => setUser((value) => !value)}
        >
          <Text style={styles.actionText}>Toggle user</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={styles.action}
          testID="one-native-map-controls-invalid"
          onPress={() => setInvalid(true)}
        >
          <Text style={styles.actionText}>Invalid child</Text>
        </Pressable>
      </View>
      <Text testID="one-native-map-controls-status" style={styles.statusText}>
        {`Controls: ${names.join(',') || 'none'} · Regions: ${regions} · Center: ${center}`}
      </Text>
      <One.iOS.Map
        distance={4000}
        latitude={37.7955}
        longitude={-122.3937}
        markers={pins}
        style={styles.map}
        testID="one-native-map-controls-view"
        onRegionChange={(latitude, longitude) => {
          setRegions((count) => count + 1)
          setCenter(`${latitude.toFixed(4)},${longitude.toFixed(4)}`)
        }}
      >
        {compass ? <One.iOS.MapCompass /> : null}
        {pitch ? <One.iOS.MapPitchToggle /> : null}
        {user ? <One.iOS.MapUserLocationButton /> : null}
      </One.iOS.Map>
      {invalid ? (
        <Boundary testID="one-native-map-controls-error">
          <One.iOS.Map markers={[]}>
            <One.iOS.Text text="oops" />
          </One.iOS.Map>
        </Boundary>
      ) : null}
    </View>
  )
}

class Boundary extends Component<{ children: ReactNode; testID: string }, { error: string }> {
  state = { error: '' }
  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error.message : String(error) }
  }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <View>
        <Text testID={this.props.testID} style={styles.statusText}>
          {`Error: ${this.state.error}`}
        </Text>
      </View>
    )
  }
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
  actionText: { color: '#17233A', fontSize: 12, fontWeight: '600' },
  statusText: { color: '#17233A', fontSize: 11, fontVariant: ['tabular-nums'] },
  // Map is a fill control: it reports no ideal height, so Yoga's box is its size.
  map: { marginTop: 8, flex: 1 },
})
