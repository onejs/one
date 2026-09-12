import { useState } from 'react'
import { Swift } from 'one-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'

const axes = ['vertical', 'horizontal'] as const
const spacings = [0, 20] as const

export default function OneNativeHost() {
  const [axis, setAxis] = useState<(typeof axes)[number]>('vertical')
  const [spacing, setSpacing] = useState<number>(0)
  const [expanded, setExpanded] = useState(false)
  const [isOn, setIsOn] = useState(false)
  const [changes, setChanges] = useState(0)
  const [taps, setTaps] = useState(0)
  const [step, setStep] = useState(0)
  const [label, setLabel] = useState('Toggle')
  const [height, setHeight] = useState(0)
  const [width, setWidth] = useState(0)

  return (
    <View style={styles.screen} testID="one-native-host-screen">
      <View style={styles.row}>
        {axes.map((value) => (
          <Pressable
            key={value}
            testID={`one-native-host-axis-${value}`}
            style={[styles.chip, axis === value && styles.chipOn]}
            onPress={() => setAxis(value)}
          >
            <Text>{value}</Text>
          </Pressable>
        ))}
        {spacings.map((value) => (
          <Pressable
            key={value}
            testID={`one-native-host-spacing-${value}`}
            style={[styles.chip, spacing === value && styles.chipOn]}
            onPress={() => setSpacing(value)}
          >
            <Text>{`gap ${value}`}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.row}>
        <Pressable
          testID="one-native-host-expand"
          style={[styles.chip, expanded && styles.chipOn]}
          onPress={() => setExpanded((value) => !value)}
        >
          <Text>{expanded ? 'Three children' : 'One child'}</Text>
        </Pressable>
        <Pressable
          testID="one-native-host-relabel"
          style={styles.chip}
          onPress={() => setLabel((value) => (value === 'Toggle' ? 'Toggle with a much longer label that wraps onto a second line' : 'Toggle'))}
        >
          <Text>Relabel</Text>
        </Pressable>
      </View>

      <Swift.Host
        testID="one-native-host"
        axis={axis}
        spacing={spacing}
        alignment="leading"
        style={styles.host}
        onLayout={({ nativeEvent }) => {
          setHeight(Math.round(nativeEvent.layout.height))
          setWidth(Math.round(nativeEvent.layout.width))
        }}
      >
        <Swift.Toggle
          label={label}
          isOn={isOn}
          onIsOnChange={(value) => {
            setIsOn(value)
            setChanges((count) => count + 1)
          }}
        />
        {expanded ? (
          <Swift.Button label="Composed button" onPress={() => setTaps((count) => count + 1)} />
        ) : null}
        {expanded ? (
          <Swift.Stepper
            label="Composed stepper"
            value={step}
            minimumValue={0}
            maximumValue={10}
            onValueChange={setStep}
          />
        ) : null}
      </Swift.Host>

      <Text testID="one-native-host-size" style={styles.line}>{`Host: ${width} x ${height}`}</Text>
      <Text testID="one-native-host-toggle" style={styles.line}>{`IsOn: ${isOn}`}</Text>
      <Text testID="one-native-host-changes" style={styles.line}>{`Changes: ${changes}`}</Text>
      <Text testID="one-native-host-taps" style={styles.line}>{`Taps: ${taps}`}</Text>
      <Text testID="one-native-host-step" style={styles.line}>{`Step: ${step}`}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, paddingTop: 70, gap: 8, backgroundColor: '#fff' },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#eee' },
  chipOn: { backgroundColor: '#cfe2ff' },
  host: { backgroundColor: '#f2f5ff' },
  line: { fontSize: 14 },
})
