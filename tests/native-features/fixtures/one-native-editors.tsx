import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

// newlines are what separates a TextEditor from a single-line field, so the status rows
// show them as a visible mark instead of breaking the accessibility label.
const show = (text: string) => text.replace(/\n/g, '⏎')

export default function OneNativeEditors() {
  const [text, setText] = useState('')
  const [observed, setObserved] = useState('')
  const [reject, setReject] = useState(false)
  const [revision, setRevision] = useState(0)
  const [wide, setWide] = useState(false)
  const status: [string, string | number][] = [
    ['Value', show(text)],
    ['Request', show(observed)],
    ['Lines', text === '' ? 0 : text.split('\n').length],
    ['Reject', reject ? 'on' : 'off'],
    ['Revision', revision],
    ['Corners', wide ? 'wide' : 'narrow'],
  ]

  return (
    <View style={styles.screen} testID="one-native-editors-screen">
      <View style={styles.status}>
        {status.map(([label, value]) => (
          <Text key={label} style={styles.statusText}>
            {`${label}: ${value}`}
          </Text>
        ))}
      </View>
      <One.iOS.TextEditor
        text={text}
        revision={revision}
        onTextChange={(next) => {
          setObserved(next)
          if (!reject) setText(next)
        }}
        textInputAutocapitalization="never"
        autocorrectionDisabled
        accessibilityLabel="Notes editor"
        style={styles.editor}
        testID="one-native-editor"
      />
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          style={styles.action}
          testID="one-native-editor-reject"
          onPress={() => setReject((value) => !value)}
        >
          <Text style={styles.actionText}>Reject edits</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={styles.action}
          testID="one-native-editor-external"
          onPress={() => setText('first\nsecond\nthird')}
        >
          <Text style={styles.actionText}>External set</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={styles.action}
          testID="one-native-editor-reset"
          onPress={() => {
            setText('')
            setRevision((value) => value + 1)
          }}
        >
          <Text style={styles.actionText}>Reset revision</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={styles.action}
          testID="one-native-editor-corners"
          onPress={() => setWide((value) => !value)}
        >
          <Text style={styles.actionText}>Swap corners</Text>
        </Pressable>
      </View>
      {/* the shape is not an accessibility element; its box is, so the suite reads
          the box's frame and samples the screenshot at its corners. */}
      <View accessible accessibilityLabel="Shape canvas" style={styles.canvas}>
        <One.iOS.UnevenRoundedRectangle
          fill="#FF3B30"
          topLeadingRadius={wide ? 60 : 0}
          bottomLeadingRadius={0}
          bottomTrailingRadius={wide ? 0 : 60}
          topTrailingRadius={0}
          style={styles.shape}
          testID="one-native-editor-shape"
        />
      </View>
      <View style={styles.compareRow}>
        <View accessible accessibilityLabel="Concentric shape canvas" style={styles.concentricCanvas}>
          <One.iOS.ScrollView
            showsIndicators={false}
            swiftStyle={{ containerShape: 'capsule' }}
            style={styles.concentricCanvas}
          >
            <One.iOS.ConcentricRectangle
              fill="#007AFF"
              swiftStyle={{ frameWithWidthAndHeightAndAlignment: { width: 160, height: 100, alignment: 'center' } }}
              style={styles.concentricCanvas}
              testID="one-native-concentric-shape"
            />
          </One.iOS.ScrollView>
        </View>
        <View accessible accessibilityLabel="Rectangle control canvas" style={styles.concentricCanvas}>
          <One.iOS.ScrollView
            showsIndicators={false}
            swiftStyle={{ containerShape: 'capsule' }}
            style={styles.concentricCanvas}
          >
            <One.iOS.Rectangle
              fill="#007AFF"
              swiftStyle={{ frameWithWidthAndHeightAndAlignment: { width: 160, height: 100, alignment: 'center' } }}
              style={styles.concentricCanvas}
            />
          </One.iOS.ScrollView>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 10, paddingTop: 8, backgroundColor: '#FFFFFF' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 8 },
  action: {
    minHeight: 34,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#E3E3E8',
  },
  actionText: { color: '#17233A', fontSize: 12, fontWeight: '600' },
  status: { marginBottom: 6, padding: 6, borderRadius: 8, backgroundColor: '#F5F5F7' },
  statusText: { color: '#17233A', fontSize: 11, fontVariant: ['tabular-nums'] },
  editor: { height: 140, alignSelf: 'stretch' },
  canvas: { marginTop: 12, width: 160, height: 120, backgroundColor: '#FFFFFF' },
  compareRow: { marginTop: 12, flexDirection: 'row', gap: 12 },
  concentricCanvas: { width: 160, height: 100, backgroundColor: '#FFFFFF' },
  shape: { flex: 1 },
})
