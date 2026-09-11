import { useState } from 'react'
import { Swift } from 'one-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'

export default function OneNativeContainers() {
  const [isOn, setIsOn] = useState(false)
  const [sectionTaps, setSectionTaps] = useState(0)
  const [hostTaps, setHostTaps] = useState(0)
  const [extra, setExtra] = useState(false)
  const [footer, setFooter] = useState(false)
  const [height, setHeight] = useState(0)

  return (
    <View style={styles.screen} testID="one-native-containers-screen">
      <View style={styles.row}>
        <Pressable
          testID="one-native-container-extra"
          style={[styles.chip, extra && styles.chipOn]}
          onPress={() => setExtra((value) => !value)}
        >
          <Text>{extra ? 'Two sections' : 'One section'}</Text>
        </Pressable>
        <Pressable
          testID="one-native-container-footer"
          style={[styles.chip, footer && styles.chipOn]}
          onPress={() => setFooter((value) => !value)}
        >
          <Text>Footer</Text>
        </Pressable>
      </View>

      <View style={styles.row}>
        <Swift.Text
          text="Standalone text"
          style={styles.leaf}
          testID="one-native-container-text"
        />
        <Swift.Label
          label="Standalone label"
          systemImage="star.fill"
          style={styles.leaf}
          testID="one-native-container-label"
        />
      </View>

      <Swift.Form
        testID="one-native-container-form"
        style={styles.form}
        onLayout={({ nativeEvent }) => setHeight(Math.round(nativeEvent.layout.height))}
      >
        <Swift.Section title="Details" footer={footer ? 'Two of two' : ''}>
          <Swift.Text text="Composed text" />
          <Swift.Label label="Composed label" systemImage="star.fill" />
          <Swift.Toggle label="Notify" isOn={isOn} onIsOnChange={setIsOn} />
        </Swift.Section>
        {extra ? (
          <Swift.Section title="More">
            <Swift.Button
              label="Section button"
              onPress={() => setSectionTaps((count) => count + 1)}
            />
            <Swift.Host axis="horizontal" spacing={12}>
              <Swift.Text text="In host" />
              <Swift.Button
                label="Host button"
                onPress={() => setHostTaps((count) => count + 1)}
              />
            </Swift.Host>
          </Swift.Section>
        ) : null}
      </Swift.Form>

      <Text
        testID="one-native-container-height"
        style={styles.line}
      >{`Form: ${height}`}</Text>
      <Text testID="one-native-container-toggle" style={styles.line}>{`IsOn: ${isOn}`}</Text>
      <Text
        testID="one-native-container-section-taps"
        style={styles.line}
      >{`Section taps: ${sectionTaps}`}</Text>
      <Text
        testID="one-native-container-host-taps"
        style={styles.line}
      >{`Host taps: ${hostTaps}`}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, paddingTop: 70, gap: 8, backgroundColor: '#fff' },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#eee' },
  chipOn: { backgroundColor: '#cfe2ff' },
  leaf: { width: 150 },
  form: { flex: 1 },
  line: { fontSize: 14 },
})
