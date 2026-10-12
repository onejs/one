import { Component, useCallback, useEffect, useState, type ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

// the reader runs its content closure with a native GeometryProxy snapshot:
// size, the global and local frames, and the safe-area insets. the closure's
// content composes natively. the status reporter observes through an effect,
// which is how an app reads geometry without setting state during render. the
// width toggle drives the geometry-change leg: the status line shows the latest
// proxy values and how many frames native reported. the static and React
// Native legs stay unmounted until their pressables run.
type GeometrySnapshot = {
  size: { width: number; height: number }
  safeAreaInsets: { top: number; leading: number; bottom: number; trailing: number }
  frame(coordinateSpace: 'global' | 'local'): { x: number; y: number; width: number; height: number }
}

function GeometryStatus({
  geometry,
  onFrame,
}: {
  geometry: GeometrySnapshot
  onFrame: (geometry: GeometrySnapshot) => void
}) {
  useEffect(() => {
    onFrame(geometry)
  }, [geometry, onFrame])
  return (
    <One.iOS.Text
      text={`content ${Math.round(geometry.size.width)}x${Math.round(geometry.size.height)}`}
    />
  )
}

export default function OneNativeGeometryReader() {
  const [width, setWidth] = useState(200)
  const [frames, setFrames] = useState(0)
  const [frame, setFrame] = useState('none')
  const [staticChild, setStaticChild] = useState(false)
  const [nativeChild, setNativeChild] = useState(false)

  const onFrame = useCallback((geometry: GeometrySnapshot) => {
    const rect = (frame: ReturnType<GeometrySnapshot['frame']>) =>
      `${Math.round(frame.width)}x${Math.round(frame.height)} @ ${Math.round(frame.x)},${Math.round(frame.y)}`
    const { top, leading, bottom, trailing } = geometry.safeAreaInsets
    setFrames((count) => count + 1)
    setFrame(
      `${rect(geometry.frame('global'))} · Local: ${rect(geometry.frame('local'))}` +
        ` · Size: ${Math.round(geometry.size.width)}x${Math.round(geometry.size.height)}` +
        ` · Insets: ${[top, leading, bottom, trailing].map(Math.round).join(',')}`
    )
  }, [])

  return (
    <View style={styles.screen} testID="one-native-geometry-reader-screen">
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          style={styles.action}
          testID="one-native-geometry-reader-toggle-width"
          onPress={() => setWidth((value) => (value === 200 ? 120 : 200))}
        >
          <Text style={styles.actionText}>Toggle width</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={styles.action}
          testID="one-native-geometry-reader-invalid-static"
          onPress={() => setStaticChild(true)}
        >
          <Text style={styles.actionText}>Static child</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={styles.action}
          testID="one-native-geometry-reader-invalid-native"
          onPress={() => setNativeChild(true)}
        >
          <Text style={styles.actionText}>Native child</Text>
        </Pressable>
      </View>
      <Text testID="one-native-geometry-reader-status" style={styles.statusText}>
        {`Frame: ${frame} · Frames: ${frames}`}
      </Text>
      <One.iOS.GeometryReader
        style={{ width, height: 100 }}
        testID="one-native-geometry-reader-view"
      >
        {(geometry) => <GeometryStatus geometry={geometry} onFrame={onFrame} />}
      </One.iOS.GeometryReader>
      {staticChild ? (
        <Boundary testID="one-native-geometry-reader-static-error">
          <One.iOS.GeometryReader>
            {(<One.iOS.Text text="static" /> as unknown as () => ReactNode)}
          </One.iOS.GeometryReader>
        </Boundary>
      ) : null}
      {nativeChild ? (
        <Boundary testID="one-native-geometry-reader-native-error">
          <One.iOS.GeometryReader>
            {(() => <View />) as unknown as () => ReactNode}
          </One.iOS.GeometryReader>
        </Boundary>
      ) : null}
    </View>
  )
}

class Boundary extends Component<
  { children: ReactNode; testID: string },
  { error: string }
> {
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
})
