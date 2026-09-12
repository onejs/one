import { useState } from 'react'
import { Swift } from 'one-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'

export default function OneNativeContainers() {
  const [isOn, setIsOn] = useState(false)
  const [sectionTaps, setSectionTaps] = useState(0)
  const [slotTaps, setSlotTaps] = useState(0)
  const [nestedTaps, setNestedTaps] = useState(0)
  const [hostTaps, setHostTaps] = useState(0)
  const [extra, setExtra] = useState(false)
  const [footer, setFooter] = useState(false)
  const [environment, setEnvironment] = useState(false)
  const [formSize, setFormSize] = useState({ width: 0, height: 0 })

  const environmentProps = environment
    ? ({
        colorScheme: 'dark',
        dynamicTypeSize: 'accessibility1',
        locale: 'fr-FR',
        tint: '#FF9500',
        isEnabled: false,
      } as const)
    : {}

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
        <Pressable
          testID="one-native-container-environment"
          style={[styles.chip, environment && styles.chipOn]}
          onPress={() => setEnvironment((value) => !value)}
        >
          <Text>{environment ? 'Environment on' : 'Environment off'}</Text>
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

      {environment ? (
        <Swift.Host {...environmentProps} axis="horizontal" spacing={8}>
          <Swift.Text text="Host environment" />
          <Swift.Button label="Host disabled" />
        </Swift.Host>
      ) : null}

      <Swift.Form
        {...environmentProps}
        style={styles.form}
        onLayout={({ nativeEvent }) =>
          setFormSize({
            width: Math.round(nativeEvent.layout.width),
            height: Math.round(nativeEvent.layout.height),
          })
        }
      >
        <Swift.Section title="Details" footer={footer ? 'Two of two' : ''}>
          <Swift.Text text="Composed text" />
          <Swift.Label label="Composed label" systemImage="star.fill" />
          <Swift.Toggle label="Notify" isOn={isOn} onIsOnChange={setIsOn} />
          <Swift.Slot height={44}>
            <Pressable
              testID="one-native-container-slot"
              style={styles.slot}
              onPress={() => setSlotTaps((count) => count + 1)}
            >
              <Text>React Native row</Text>
            </Pressable>
          </Swift.Slot>
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
              <Swift.Slot height={30} width={90}>
                <Pressable
                  testID="one-native-container-nested-slot"
                  style={styles.slot}
                  onPress={() => setNestedTaps((count) => count + 1)}
                >
                  <Text>Nested row</Text>
                </Pressable>
              </Swift.Slot>
            </Swift.Host>
          </Swift.Section>
        ) : null}
      </Swift.Form>

      <View style={styles.row}>
        <Text
          testID="one-native-container-height"
          style={styles.line}
        >{`Form: ${formSize.width} x ${formSize.height}`}</Text>
        <Text
          testID="one-native-container-toggle"
          style={styles.line}
        >{`IsOn: ${isOn}`}</Text>
        <Text
          testID="one-native-container-section-taps"
          style={styles.line}
        >{`Section taps: ${sectionTaps}`}</Text>
        <Text
          testID="one-native-container-host-taps"
          style={styles.line}
        >{`Host taps: ${hostTaps}`}</Text>
        <Text
          testID="one-native-container-slot-taps"
          style={styles.line}
        >{`Slot taps: ${slotTaps}`}</Text>
        <Text
          testID="one-native-container-nested-taps"
          style={styles.line}
        >{`Nested taps: ${nestedTaps}`}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, paddingTop: 70, gap: 8, backgroundColor: '#fff' },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  chipOn: { backgroundColor: '#cfe2ff' },
  leaf: { width: 150 },
  form: { flex: 1 },
  slot: { flex: 1, justifyContent: 'center', backgroundColor: '#e8f0ff' },
  line: { fontSize: 14 },
})
