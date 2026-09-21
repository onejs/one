import { One } from 'one'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'

type Detent = 'medium' | 'large'

export default function AdaptivePanelOracle() {
  const [open, setOpen] = useState(false)
  const [selectedDetent, setSelectedDetent] = useState<Detent>('medium')
  const [placement, setPlacement] = useState('hidden')
  const [frame, setFrame] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const [placementCount, setPlacementCount] = useState(0)
  const [frameCount, setFrameCount] = useState(0)
  const [canvasCount, setCanvasCount] = useState(0)
  const [panelCount, setPanelCount] = useState(0)
  const [panelText, setPanelText] = useState('')
  const insets = One.UI.SafeArea.useInsets()

  return (
    <View style={styles.container} testID="adaptive-panel-screen">
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Adaptive panel oracle</Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={open ? 'Close panel' : 'Open panel'}
          testID="adaptive-panel-toggle"
          style={styles.action}
          onPress={() => setOpen((value) => !value)}
        >
          <Text style={styles.actionText}>{open ? 'Close panel' : 'Open panel'}</Text>
        </Pressable>

        <Text testID="adaptive-panel-open">Open: {String(open)}</Text>
        <Text testID="adaptive-panel-placement">
          Placement: {placement} ({placementCount})
        </Text>
        <Text testID="adaptive-panel-frame">
          Frame: {Math.round(frame.x)},{Math.round(frame.y)} {Math.round(frame.width)}x
          {Math.round(frame.height)} ({frameCount})
        </Text>
        <Text testID="adaptive-panel-detent">Detent: {selectedDetent}</Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Select medium detent"
          testID="adaptive-panel-detent-medium"
          style={styles.action}
          onPress={() => setSelectedDetent('medium')}
        >
          <Text style={styles.actionText}>Medium</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Select large detent"
          testID="adaptive-panel-detent-large"
          style={styles.action}
          onPress={() => setSelectedDetent('large')}
        >
          <Text style={styles.actionText}>Large</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Canvas tap target"
          testID="adaptive-panel-canvas-tap"
          style={styles.action}
          onPress={() => setCanvasCount((count) => count + 1)}
        >
          <Text style={styles.actionText}>Canvas tap: {canvasCount}</Text>
        </Pressable>

        <Text testID="adaptive-panel-insets">
          Insets: {insets.top},{insets.right},{insets.bottom},{insets.left}
        </Text>
      </ScrollView>

      <One.UI.AdaptivePanel
        open={open}
        onOpenChange={setOpen}
        compactDetents={['medium', 'large']}
        selectedDetent={selectedDetent}
        onSelectedDetentChange={(detent) => {
          if (detent === 'medium' || detent === 'large') setSelectedDetent(detent)
        }}
        regularWidth={320}
        onPlacementChange={(next) => {
          setPlacement(next)
          setPlacementCount((count) => count + 1)
        }}
        onFrameChange={(next) => {
          setFrame(next)
          setFrameCount((count) => count + 1)
        }}
        testID="adaptive-panel"
      >
        <View style={styles.panel} testID="adaptive-panel-content">
          <Text style={styles.title}>Panel content</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Panel tap target"
            testID="adaptive-panel-panel-tap"
            style={styles.action}
            onPress={() => setPanelCount((count) => count + 1)}
          >
            <Text style={styles.actionText}>Panel tap: {panelCount}</Text>
          </Pressable>
          <TextInput
            testID="adaptive-panel-input"
            accessibilityLabel="Panel input"
            style={styles.input}
            value={panelText}
            onChangeText={setPanelText}
            placeholder="Type to test keyboard and state"
          />
          <Text testID="adaptive-panel-text">Text: {panelText}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close panel from inside"
            testID="adaptive-panel-close"
            style={styles.action}
            onPress={() => setOpen(false)}
          >
            <Text style={styles.actionText}>Close</Text>
          </Pressable>
        </View>
      </One.UI.AdaptivePanel>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 20, gap: 12, paddingBottom: 120 },
  title: { fontSize: 22, fontWeight: '700' },
  action: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { color: '#1465c0', fontSize: 16, fontWeight: '600' },
  panel: { flex: 1, padding: 20, gap: 12, backgroundColor: '#fff' },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
})
