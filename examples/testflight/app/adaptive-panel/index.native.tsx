import { One, Stack } from 'one'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'

type Detent = 'medium' | { fraction: number }

const panelRows = Array.from({ length: 30 }, (_, index) => `Panel row ${index + 1}`)

function detentLabel(detent: Detent) {
  return typeof detent === 'string' ? detent : `${Math.round(detent.fraction * 100)}%`
}

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
  const [toolbarCount, setToolbarCount] = useState(0)
  const [bottomCount, setBottomCount] = useState(0)
  const insets = One.UI.SafeArea.useInsets()

  return (
    <View style={styles.container} testID="adaptive-panel-screen">
      <Stack.Screen>
        <Stack.Toolbar>
          <Stack.Toolbar.Trailing>
            <Stack.Toolbar.Item
              identifier="adaptive-panel-probe"
              title="Probe"
              systemImageName="magnifyingglass"
              accessibilityLabel="Adaptive panel toolbar probe"
              onPress={() => setToolbarCount((count) => count + 1)}
            />
          </Stack.Toolbar.Trailing>
        </Stack.Toolbar>
      </Stack.Screen>

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
        <Text testID="adaptive-panel-detent">Detent: {detentLabel(selectedDetent)}</Text>
        <Text testID="adaptive-panel-toolbar-count">Toolbar taps: {toolbarCount}</Text>
        <Text testID="adaptive-panel-bottom-count">Bottom taps: {bottomCount}</Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Canvas tap target"
          testID="adaptive-panel-canvas-tap"
          style={styles.action}
          onPress={() => setCanvasCount((count) => count + 1)}
        >
          <Text style={styles.actionText}>Canvas tap: {canvasCount}</Text>
        </Pressable>

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
          accessibilityLabel="Select 75 percent detent"
          testID="adaptive-panel-detent-large"
          style={styles.action}
          onPress={() => setSelectedDetent({ fraction: 0.75 })}
        >
          <Text style={styles.actionText}>75%</Text>
        </Pressable>

        <Text testID="adaptive-panel-insets">
          Insets: {insets.top},{insets.right},{insets.bottom},{insets.left}
        </Text>
      </ScrollView>

      <Stack.Toolbar.Bottom>
        <Stack.Toolbar.Item
          identifier="adaptive-panel-bottom-probe"
          title="Bottom"
          systemImageName="plus"
          accessibilityLabel="Adaptive panel bottom probe"
          onSelected={() => setBottomCount((count) => count + 1)}
        />
      </Stack.Toolbar.Bottom>

      <One.UI.AdaptivePanel
        open={open}
        onOpenChange={setOpen}
        compactDetents={['medium', { fraction: 0.75 }]}
        selectedDetent={selectedDetent}
        onSelectedDetentChange={(detent) => {
          if (detent === 'medium') setSelectedDetent(detent)
          else if (typeof detent === 'object' && detent.fraction === 0.75)
            setSelectedDetent(detent)
        }}
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
          <View style={styles.panelDetents}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Panel medium detent"
              testID="adaptive-panel-panel-medium"
              style={styles.panelDetent}
              onPress={() => setSelectedDetent('medium')}
            >
              <Text style={styles.actionText}>Medium</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Panel 75 percent detent"
              testID="adaptive-panel-panel-large"
              style={styles.panelDetent}
              onPress={() => setSelectedDetent({ fraction: 0.75 })}
            >
              <Text style={styles.actionText}>75%</Text>
            </Pressable>
          </View>
          <ScrollView
            testID="adaptive-panel-scroll"
            style={styles.panelScroll}
            contentContainerStyle={styles.panelScrollContent}
          >
            {panelRows.map((row) => (
              <Text key={row} style={styles.panelRow}>
                {row}
              </Text>
            ))}
          </ScrollView>
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
  panelScroll: { flex: 1, minHeight: 120 },
  panelScrollContent: { gap: 8, paddingBottom: 20 },
  panelRow: { fontSize: 15, color: '#333' },
  panelDetents: { flexDirection: 'row', gap: 12 },
  panelDetent: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: '#f0f4f8',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
