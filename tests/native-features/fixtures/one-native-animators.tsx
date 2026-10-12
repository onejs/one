import { Component, useCallback, useState, type ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

// SwiftUI One.iOS.PhaseAnimator and One.iOS.KeyframeAnimator. each animated box reports its
// frame through onGeometryChange, which SwiftUI calls with the laid-out size:
// a phase change reports the phase's target width, and a keyframe timeline
// reports the width of every frame it renders. the cycling box runs without a
// trigger so screenshots can catch SwiftUI interpolating between its phases.
// the invalid legs stay unmounted until their pressables run.
const phaseWidths = [60, 140, 100]

type Size = { newValue: { width: number; height: number } }

function useWidthLog() {
  const [log, setLog] = useState<number[]>([])
  const onSize = useCallback(({ newValue }: Size) => {
    const width = Math.round(newValue.width)
    setLog((log) => (log.at(-1) === width ? log : [...log, width]))
  }, [])
  return [log, onSize] as const
}

export default function OneNativeAnimators() {
  const [phaseTrigger, setPhaseTrigger] = useState(0)
  const [keyframeTrigger, setKeyframeTrigger] = useState(0)
  const [phaseLog, onPhaseSize] = useWidthLog()
  const [keyframeLog, onKeyframeSize] = useWidthLog()
  const [invalid, setInvalid] = useState('')

  const action = (testID: string, label: string, onPress: () => void) => (
    <Pressable accessibilityRole="button" style={styles.action} testID={testID} onPress={onPress}>
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  )

  return (
    <View style={styles.screen} testID="one-native-animators-screen">
      <View style={styles.row}>
        {action('one-native-animators-run-phases', 'Run phases', () => setPhaseTrigger((n) => n + 1))}
        {action('one-native-animators-interrupt-phases', 'Interrupt phases', () => {
          setPhaseTrigger((n) => n + 1)
          setTimeout(() => setPhaseTrigger((n) => n + 1), 150)
        })}
        {action('one-native-animators-run-keyframes', 'Run keyframes', () => setKeyframeTrigger((n) => n + 1))}
        {action('one-native-animators-interrupt-keyframes', 'Interrupt keyframes', () => {
          setKeyframeTrigger((n) => n + 1)
          setTimeout(() => setKeyframeTrigger((n) => n + 1), 250)
        })}
      </View>
      <Text testID="one-native-animators-phase-log" style={styles.statusText}>
        {`Phases: ${phaseLog.join(' ')}`}
      </Text>
      <Text testID="one-native-animators-keyframe-log" style={styles.statusText}>
        {`Keyframes: ${keyframeLog.length} frames, max ${Math.max(0, ...keyframeLog)}, last ${keyframeLog.at(-1) ?? 'none'}`}
      </Text>
      <One.iOS.PhaseAnimator
        phases={[0, 1, 2]}
        trigger={phaseTrigger}
        animation={(phase) => (phase === 2 ? 'snappy' : 'easeInOut')}
        style={styles.lane}
        testID="one-native-animators-phase"
      >
        {(phase) => (
          <One.iOS.Rectangle
            fill="#3B82F6"
            swiftStyle={{ width: phaseWidths[phase], height: 24, onGeometryChangeWithSize: onPhaseSize }}
          />
        )}
      </One.iOS.PhaseAnimator>
      <One.iOS.KeyframeAnimator
        initialValue={{ width: 60, lift: 0 }}
        trigger={keyframeTrigger}
        keyframes={() => [
          One.iOS.KeyframeTrack('width', [
            One.iOS.LinearKeyframe(220, { duration: 0.8, timingCurve: 'easeInOut' }),
            One.iOS.SpringKeyframe(60, { duration: 0.6, spring: 'snappy' }),
          ]),
          One.iOS.KeyframeTrack('lift', [
            One.iOS.CubicKeyframe(8, { duration: 0.4 }),
            One.iOS.MoveKeyframe(0),
          ]),
        ]}
        style={styles.lane}
        testID="one-native-animators-keyframe"
      >
        {(value) => (
          <One.iOS.Rectangle
            fill="#10B981"
            swiftStyle={{
              width: value.width,
              height: 24,
              offset: { x: 0, y: -value.lift },
              onGeometryChangeWithSize: onKeyframeSize,
            }}
          />
        )}
      </One.iOS.KeyframeAnimator>
      <One.iOS.PhaseAnimator
        phases={[40, 240]}
        animation={() => 'linear'}
        style={styles.lane}
        testID="one-native-animators-cycle"
      >
        {(width) => <One.iOS.Rectangle fill="#FF00FF" swiftStyle={{ width, height: 24 }} />}
      </One.iOS.PhaseAnimator>
      <View style={styles.row}>
        {action('one-native-animators-invalid-empty', 'Empty phases', () => setInvalid('empty'))}
        {action('one-native-animators-invalid-static', 'Static content', () => setInvalid('static'))}
        {action('one-native-animators-invalid-prop', 'Phase prop', () => setInvalid('prop'))}
        {action('one-native-animators-invalid-curve', 'Curved value', () => setInvalid('curve'))}
        {action('one-native-animators-invalid-keyframes', 'Value keyframes', () => setInvalid('keyframes'))}
      </View>
      {invalid ? (
        <Boundary key={invalid} testID="one-native-animators-error">
          {invalid === 'empty' ? (
            <One.iOS.PhaseAnimator phases={[]}>{() => <One.iOS.Text text="empty" />}</One.iOS.PhaseAnimator>
          ) : invalid === 'static' ? (
            <One.iOS.PhaseAnimator phases={[0, 1]}>
              {(<One.iOS.Text text="static" />) as unknown as () => ReactNode}
            </One.iOS.PhaseAnimator>
          ) : invalid === 'prop' ? (
            <One.iOS.PhaseAnimator phases={[0, 1]}>{(phase) => <One.iOS.Text text={`phase ${phase}`} />}</One.iOS.PhaseAnimator>
          ) : invalid === 'curve' ? (
            <One.iOS.KeyframeAnimator initialValue={1} keyframes={() => [One.iOS.LinearKeyframe(2, { duration: 1 })]}>
              {(value) => <One.iOS.Rectangle fill="#FF00FF" swiftStyle={{ width: value * value * 20, height: 24 }} />}
            </One.iOS.KeyframeAnimator>
          ) : (
            <One.iOS.KeyframeAnimator
              initialValue={1}
              keyframes={(value) => [One.iOS.LinearKeyframe(value * 2, { duration: 1 })]}
            >
              {(value) => <One.iOS.Rectangle fill="#FF00FF" swiftStyle={{ width: value * 20, height: 24 }} />}
            </One.iOS.KeyframeAnimator>
          )}
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
  screen: { flex: 1, padding: 16, gap: 12, backgroundColor: '#fff' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  action: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: '#E5E7EB' },
  actionText: { fontSize: 13, color: '#111' },
  statusText: { fontSize: 13, color: '#111' },
  lane: { height: 40 },
})
