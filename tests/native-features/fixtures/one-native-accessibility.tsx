import { useState } from 'react'
import { Swift } from 'one-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'

const short = 'Short line'
const long =
  'A much longer paragraph of text that cannot fit on one line at this width and has to wrap onto several, which is exactly the case a fixed height used to clip.'

export default function OneNativeAccessibility() {
  const [wrapped, setWrapped] = useState(false)
  const [standaloneOn, setStandaloneOn] = useState(false)
  const [hostOn, setHostOn] = useState(false)
  const [formOn, setFormOn] = useState(false)
  const [taps, setTaps] = useState(0)
  const [textHeight, setTextHeight] = useState(0)
  const [toggleHeight, setToggleHeight] = useState(0)

  return (
    <View style={styles.screen} testID="one-native-accessibility-screen">
      <View style={styles.row}>
        <Pressable
          testID="one-native-a11y-wrap"
          style={[styles.chip, wrapped && styles.chipOn]}
          onPress={() => setWrapped((value) => !value)}
        >
          <Text>{wrapped ? 'Long text' : 'Short text'}</Text>
        </Pressable>
      </View>

      {/* standalone: the control's own UIView is on screen, and SwiftUI measures the height */}
      <Swift.Text
        testID="one-native-a11y-text"
        text={wrapped ? long : short}
        accessibilityLabel="Standalone paragraph"
        onLayout={({ nativeEvent }) => setTextHeight(Math.round(nativeEvent.layout.height))}
      />
      <Swift.Toggle
        testID="one-native-a11y-standalone"
        label="Standalone"
        accessibilityLabel="Standalone switch"
        accessibilityHint="Flips the standalone switch"
        accessibilityValue={{ text: standaloneOn ? 'on' : 'off' }}
        isOn={standaloneOn}
        onIsOnChange={setStandaloneOn}
        onLayout={({ nativeEvent }) => setToggleHeight(Math.round(nativeEvent.layout.height))}
      />

      {/* composed: these controls never join the view hierarchy, so their accessibility can
          only come from the SwiftUI content */}
      <Swift.Host axis="vertical" spacing={8} alignment="leading" style={styles.host}>
        <Swift.Toggle
          testID="one-native-a11y-composed"
          label="Composed"
          accessibilityLabel="Composed switch"
          isOn={hostOn}
          onIsOnChange={setHostOn}
        />
        <Swift.Button
          testID="one-native-a11y-button"
          label="Composed"
          accessibilityLabel="Composed action"
          onPress={() => setTaps((count) => count + 1)}
        />
      </Swift.Host>

      <Swift.Form style={styles.form}>
        <Swift.Section title="Row">
          <Swift.Toggle
            testID="one-native-a11y-form"
            label="In a form"
            accessibilityLabel="Form switch"
            isOn={formOn}
            onIsOnChange={setFormOn}
          />
        </Swift.Section>
      </Swift.Form>

      <Text testID="one-native-a11y-text-height" style={styles.line}>{`Text: ${textHeight}`}</Text>
      <Text testID="one-native-a11y-toggle-height" style={styles.line}>{`Toggle: ${toggleHeight}`}</Text>
      <Text testID="one-native-a11y-taps" style={styles.line}>{`Taps: ${taps}`}</Text>
      <Text testID="one-native-a11y-host-on" style={styles.line}>{`Host: ${hostOn}`}</Text>
      <Text testID="one-native-a11y-form-on" style={styles.line}>{`Form: ${formOn}`}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, paddingTop: 70, gap: 8, backgroundColor: '#fff' },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#eee' },
  chipOn: { backgroundColor: '#cfe2ff' },
  host: { backgroundColor: '#f2f5ff' },
  form: { height: 140 },
  line: { fontSize: 14 },
})
