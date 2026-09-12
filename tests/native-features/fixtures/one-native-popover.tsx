import { useState } from 'react'
import { Swift } from 'one-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'

export default function OneNativePopover() {
  const [open, setOpen] = useState(false)
  const [sectionOpen, setSectionOpen] = useState(false)
  const [taps, setTaps] = useState(0)
  const [height, setHeight] = useState(0)

  return (
    <View style={styles.screen} testID="one-native-popover-screen">
      <View style={styles.row}>
        <Pressable
          testID="one-native-popover-open"
          style={styles.chip}
          onPress={() => setOpen(true)}
        >
          <Text>Open</Text>
        </Pressable>
        <Pressable
          testID="one-native-popover-section-open"
          style={styles.chip}
          onPress={() => setSectionOpen(true)}
        >
          <Text>Open in section</Text>
        </Pressable>
      </View>

      <Swift.Popover
        testID="one-native-popover-trigger"
        isPresented={open}
        onIsPresentedChange={setOpen}
        arrowEdge="top"
        presentationCompactAdaptation="popover"
        contentWidth={260}
        contentHeight={160}
        onLayout={({ nativeEvent }) =>
          setHeight(Math.round(nativeEvent.layout.height))
        }
        content={
          <View style={styles.body}>
            <Text testID="one-native-popover-body">Popover body</Text>
            <Pressable
              testID="one-native-popover-tap"
              style={styles.action}
              onPress={() => setTaps((count) => count + 1)}
            >
              <Text>Tap me</Text>
            </Pressable>
            <Pressable
              testID="one-native-popover-close"
              style={styles.action}
              onPress={() => setOpen(false)}
            >
              <Text>Close</Text>
            </Pressable>
          </View>
        }
      >
        <Swift.Button label="Trigger" onPress={() => setOpen(true)} />
      </Swift.Popover>

      <Swift.Form style={styles.form}>
        <Swift.Section title="Row">
          <Swift.Text text="Section row" />
          <Swift.Popover
            testID="one-native-popover-section"
            isPresented={sectionOpen}
            onIsPresentedChange={setSectionOpen}
            contentWidth={240}
            contentHeight={120}
            content={
              <View style={styles.body}>
                <Text testID="one-native-popover-section-body">
                  Section body
                </Text>
              </View>
            }
          >
            <Swift.Button
              label="Section trigger"
              onPress={() => setSectionOpen(true)}
            />
          </Swift.Popover>
        </Swift.Section>
      </Swift.Form>

      <View style={styles.row}>
        <Text
          testID="one-native-popover-state"
          style={styles.line}
        >{`Open: ${open}`}</Text>
        <Text
          testID="one-native-popover-taps"
          style={styles.line}
        >{`Taps: ${taps}`}</Text>
        <Text
          testID="one-native-popover-height"
          style={styles.line}
        >{`Trigger: ${height}`}</Text>
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
  form: { flex: 1 },
  body: { flex: 1, padding: 12, gap: 8 },
  action: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#e8f0ff',
  },
  line: { fontSize: 14 },
})
