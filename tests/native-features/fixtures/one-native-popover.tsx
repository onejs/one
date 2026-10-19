import { useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

export default function OneNativePopover() {
  const [open, setOpen] = useState(false)
  const [sectionOpen, setSectionOpen] = useState(false)
  const [taps, setTaps] = useState(0)
  const [height, setHeight] = useState(0)
  // the main popover's authored root can lose its children or be hidden, then restored;
  // the instance count shows a restore reuses the same root
  const [mode, setMode] = useState<'full' | 'empty' | 'hidden'>('full')
  const [rootInstances, setRootInstances] = useState(0)
  const root = useRef<View | null>(null)
  const trackRoot = (node: View | null) => {
    if (!node || node === root.current) return
    root.current = node
    setRootInstances((count) => count + 1)
  }

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
      <View style={styles.row}>
        {(['full', 'empty', 'hidden'] as const).map((next) => (
          <Pressable
            key={next}
            testID={`one-native-popover-mode-${next}`}
            style={[styles.chip, mode === next && styles.chipSelected]}
            onPress={() => setMode(next)}
          >
            <Text>
              {next === 'full' ? 'Restore' : next === 'empty' ? 'Clear' : 'Hide'}
            </Text>
          </Pressable>
        ))}
      </View>

      <One.iOS.Popover
        isPresented={open}
        onIsPresentedChange={setOpen}
        arrowEdge="top"
        presentationCompactAdaptation="popover"
        onLayout={({ nativeEvent }) => setHeight(Math.round(nativeEvent.layout.height))}
        content={
          <View
            ref={trackRoot}
            testID="one-native-popover-root"
            style={[styles.bodyMain, mode === 'hidden' && styles.hidden]}
          >
            {mode !== 'empty' && (
              <>
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
              </>
            )}
          </View>
        }
      >
        <One.iOS.Button label="Trigger" onPress={() => setOpen(true)} />
      </One.iOS.Popover>

      <One.iOS.Form style={styles.form}>
        <One.iOS.Section title="Row">
          <One.iOS.Text text="Section row" />
          <One.iOS.Popover
            isPresented={sectionOpen}
            onIsPresentedChange={setSectionOpen}
            content={
              <View style={styles.bodySection}>
                <Text testID="one-native-popover-section-body">Section body</Text>
              </View>
            }
          >
            <One.iOS.Button
              label="Section trigger"
              onPress={() => setSectionOpen(true)}
            />
          </One.iOS.Popover>
        </One.iOS.Section>
      </One.iOS.Form>

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
        <Text
          testID="one-native-popover-mode"
          style={styles.line}
        >{`Mode: ${mode}; root instances: ${rootInstances}`}</Text>
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
  chipSelected: { backgroundColor: '#cde' },
  hidden: { display: 'none' },
  form: { flex: 1 },
  bodyMain: { width: 260, height: 160, padding: 12, gap: 8 },
  bodySection: { width: 240, height: 120, padding: 12, gap: 8 },
  action: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#e8f0ff',
  },
  line: { fontSize: 14 },
})
