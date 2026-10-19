import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

export default function OneNativeViewSlotFixture() {
  const [lifecycle, setLifecycle] = useState(false)
  const [backgroundTaps, setBackgroundTaps] = useState(0)
  const [overlayTaps, setOverlayTaps] = useState(0)
  const [insetTaps, setInsetTaps] = useState(0)

  if (lifecycle) return <OverlayLifecycleFixture onBack={() => setLifecycle(false)} />

  return (
    <View style={styles.screen} testID="one-native-view-slot-screen">
      <Pressable style={styles.modeSwitch} onPress={() => setLifecycle(true)} testID="one-native-overlay-lifecycle">
        <Text>Overlay lifecycle</Text>
      </Pressable>
      <Text>{`Background taps: ${backgroundTaps}`}</Text>
      <Text>{`Overlay taps: ${overlayTaps}`}</Text>
      <Text>{`Inset taps: ${insetTaps}`}</Text>
      <One.iOS.ViewSlot name="background" style={styles.backgroundSlot} testID="one-native-view-slot-background">
        <One.iOS.Button label="Background action" onPress={() => setBackgroundTaps((value) => value + 1)} />
        <One.iOS.ViewSlot.Content>
          <One.iOS.Rectangle fill="#B1DAFD" />
        </One.iOS.ViewSlot.Content>
      </One.iOS.ViewSlot>
      <One.iOS.Overlay alignment="bottomTrailing" style={styles.overlaySlot} testID="one-native-view-slot-overlay">
        <One.iOS.Text
          text="Overlay base"
          swiftStyle={{ frameWithWidthAndHeightAndAlignment: { width: 260, height: 100, alignment: 'center' } }}
        />
        <One.iOS.Overlay.Content>
          <One.iOS.Button label="Overlay action" onPress={() => setOverlayTaps((value) => value + 1)} />
        </One.iOS.Overlay.Content>
      </One.iOS.Overlay>
      <One.iOS.ViewSlot name="mask" style={styles.maskSlot} testID="one-native-view-slot-mask">
        <One.iOS.Rectangle fill="#D52B36" style={styles.maskShape} />
        <One.iOS.ViewSlot.Content>
          <One.iOS.Circle fill="#FFFFFF" style={styles.maskShape} />
        </One.iOS.ViewSlot.Content>
      </One.iOS.ViewSlot>
      <One.iOS.ViewSlot
        name="safeAreaInsetWithVerticalEdge"
        options={{ edge: 'bottom' }}
        style={styles.insetSlot}
        testID="one-native-view-slot-inset"
      >
        <One.iOS.Text text="Inset base" />
        <One.iOS.ViewSlot.Content>
          <One.iOS.Button label="Inset action" onPress={() => setInsetTaps((value) => value + 1)} />
        </One.iOS.ViewSlot.Content>
      </One.iOS.ViewSlot>
    </View>
  )
}

function OverlayLifecycleFixture({ onBack }: { onBack: () => void }) {
  const [generation, setGeneration] = useState(0)
  const [visible, setVisible] = useState(true)
  const [tall, setTall] = useState(false)
  const [mount, setMount] = useState(0)
  const [event, setEvent] = useState('none')
  const height = tall ? 180 : 100

  const overlay = (kind: 'standalone' | 'composed') => (
    <One.iOS.Overlay
      key={`${kind}-${mount}`}
      alignment="bottomTrailing"
      style={styles.lifecycleOverlay}
      testID={`one-native-overlay-${kind}`}
    >
      <One.iOS.Text
        text={`${kind} base ${height}`}
        swiftStyle={{ frameWithWidthAndHeightAndAlignment: { width: 260, height, alignment: 'center' } }}
      />
      {visible && (
        <One.iOS.Overlay.Content key={generation}>
          <One.iOS.Button
            label={`${kind} action ${generation}`}
            onPress={() => setEvent(`${kind} generation ${generation}`)}
          />
        </One.iOS.Overlay.Content>
      )}
    </One.iOS.Overlay>
  )

  return (
    <View style={styles.screen} testID="one-native-overlay-lifecycle-screen">
      <Text>{`Marker generation: ${generation}; visible: ${visible}; height: ${height}; mount: ${mount}`}</Text>
      <Text testID="one-native-overlay-event">{`Overlay event: ${event}`}</Text>
      <View style={styles.controls}>
        <Pressable testID="one-native-overlay-replace" onPress={() => setGeneration((value) => value + 1)}>
          <Text>Replace marker</Text>
        </Pressable>
        <Pressable testID="one-native-overlay-visible" onPress={() => setVisible((value) => !value)}>
          <Text>{visible ? 'Remove marker' : 'Restore marker'}</Text>
        </Pressable>
        <Pressable testID="one-native-overlay-height" onPress={() => setTall((value) => !value)}>
          <Text>{tall ? 'Compact base' : 'Tall base'}</Text>
        </Pressable>
        <Pressable testID="one-native-overlay-reset" onPress={() => {
          setGeneration(0)
          setVisible(true)
          setTall(false)
          setEvent('none')
          setMount((value) => value + 1)
        }}>
          <Text>Reset and remount</Text>
        </Pressable>
        <Pressable testID="one-native-overlay-back" onPress={onBack}>
          <Text>Back to baseline</Text>
        </Pressable>
      </View>
      {overlay('standalone')}
      <One.iOS.VStack spacing={0} style={styles.lifecycleOverlay} testID="one-native-overlay-composed-stack">
        {overlay('composed')}
        <One.iOS.Text text="After composed overlay" />
      </One.iOS.VStack>
      <Text testID="one-native-overlay-after">After both overlays</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 90, paddingHorizontal: 20, gap: 12, backgroundColor: '#FFFFFF' },
  modeSwitch: { position: 'absolute', top: 50, right: 20 },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  lifecycleOverlay: { width: 260 },
  backgroundSlot: { width: 260, height: 100 },
  overlaySlot: { width: 260, height: 100 },
  maskSlot: { width: 120, height: 120 },
  maskShape: { width: 120, height: 120 },
  insetSlot: { width: 260, height: 260 },
})
