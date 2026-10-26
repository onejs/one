import { Component, useState, type ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

// the canvas replays the renderer's GraphicsContext calls natively. the first canvas draws
// a fixed scene; the second hangs off a TimelineView so its hand turns with every entry
// native delivers. the invalid leg stays unmounted until its pressable runs.
export default function OneNativeCanvas() {
  const [invalid, setInvalid] = useState(false)

  return (
    <View style={styles.screen} testID="one-native-canvas-screen">
      <Pressable
        accessibilityRole="button"
        style={styles.action}
        testID="one-native-canvas-invalid"
        onPress={() => setInvalid(true)}
      >
        <Text style={styles.actionText}>Invalid opacity</Text>
      </Pressable>
      <View style={styles.canvas}>
        <One.iOS.Canvas testID="one-native-canvas-scene" style={styles.canvas}>
          {(context, size) => {
            context.fill(
              One.iOS.Path.roundedRect({ x: 0, y: 0, width: size.width, height: size.height }, 12),
              One.iOS.Shading.color('#DCE8FF')
            )
            context.fill(
              One.iOS.Path.ellipse({ x: 20, y: 20, width: 80, height: 80 }),
              One.iOS.Shading.color('#E5484D')
            )
            context.fill(
              One.iOS.Path.rect({ x: 220, y: 20, width: 60, height: 80 }),
              One.iOS.Shading.linearGradient(
                One.iOS.Gradient(['#E5484D', '#3E63DD']),
                { x: 220, y: 20 },
                { x: 280, y: 100 }
              )
            )
            context.stroke(
              One.iOS.Path.rect({ x: 120, y: 20, width: 80, height: 80 }),
              One.iOS.Shading.color('#17233A'),
              { lineWidth: 4, lineJoin: 'round' }
            )
            context.draw({ text: 'Canvas', fontSize: 20, fontWeight: 'bold', color: '#17233A' }, {
              at: { x: size.width / 2, y: size.height - 30 },
              anchor: 'center',
            })
          }}
        </One.iOS.Canvas>
      </View>
      <View style={styles.canvas}>
        <One.iOS.TimelineView
          schedule={{ type: 'periodic', from: new Date(), by: 1 }}
          testID="one-native-canvas-clock"
        >
          {(timeline) => (
            <One.iOS.Canvas swiftStyle={{ height: 160 }}>
              {(context, size) => {
                const center = { x: size.width / 2, y: size.height / 2 }
                const hand = new One.iOS.Path()
                hand.move(center)
                hand.addArc(
                  center,
                  50,
                  One.iOS.Angle.degrees(timeline.date.getUTCSeconds() * 6 - 90),
                  One.iOS.Angle.degrees(timeline.date.getUTCSeconds() * 6 - 80),
                  false
                )
                hand.closeSubpath()
                context.stroke(One.iOS.Path.ellipse({ x: center.x - 50, y: center.y - 50, width: 100, height: 100 }), One.iOS.Shading.color('#17233A'), { lineWidth: 2 })
                context.fill(hand, One.iOS.Shading.color('#E5484D'))
              }}
            </One.iOS.Canvas>
          )}
        </One.iOS.TimelineView>
      </View>
      {invalid ? (
        <Boundary testID="one-native-canvas-opacity-error">
          <One.iOS.Canvas style={styles.canvas}>
            {(context) => {
              context.opacity = 2
            }}
          </One.iOS.Canvas>
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
  screen: { flex: 1, paddingHorizontal: 10, paddingTop: 8, gap: 8, backgroundColor: '#F5F5F7' },
  canvas: { height: 160 },
  action: {
    minHeight: 34,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 8,
    backgroundColor: '#E3E3E8',
  },
  actionText: { color: '#17233A', fontSize: 12, fontWeight: '600' },
  statusText: { color: '#17233A', fontSize: 11 },
})
