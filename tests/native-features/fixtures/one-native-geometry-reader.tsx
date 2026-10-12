import { Component, useState, type ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

// the reader takes its React Native box and reports the frame SwiftUI laid it
// out in. the width toggle drives the geometry-change leg: the status line
// shows the latest frame and how many frames native reported. children are
// static native composition, so the render-function and React Native legs stay
// unmounted until their pressables run.
export default function OneNativeGeometryReader() {
  const [width, setWidth] = useState(200)
  const [frames, setFrames] = useState(0)
  const [frame, setFrame] = useState('none')
  const [renderFunction, setRenderFunction] = useState(false)
  const [nativeChild, setNativeChild] = useState(false)

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
          testID="one-native-geometry-reader-invalid-function"
          onPress={() => setRenderFunction(true)}
        >
          <Text style={styles.actionText}>Render function</Text>
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
        onGeometryChange={(next) => {
          setFrames((count) => count + 1)
          setFrame(
            `${Math.round(next.width)}x${Math.round(next.height)} @ ${Math.round(next.x)},${Math.round(next.y)}`
          )
        }}
      >
        <One.iOS.Text text="sized" />
      </One.iOS.GeometryReader>
      {renderFunction ? (
        <Boundary testID="one-native-geometry-reader-function-error">
          <One.iOS.GeometryReader>
            {(() => null) as unknown as ReactNode}
          </One.iOS.GeometryReader>
        </Boundary>
      ) : null}
      {nativeChild ? (
        <Boundary testID="one-native-geometry-reader-native-error">
          <One.iOS.GeometryReader>
            <View />
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
