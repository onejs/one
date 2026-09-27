import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

export default function OneNativeViewSlotFixture() {
  const [backgroundTaps, setBackgroundTaps] = useState(0)
  const [overlayTaps, setOverlayTaps] = useState(0)
  const [insetTaps, setInsetTaps] = useState(0)

  return (
    <View style={styles.screen} testID="one-native-view-slot-screen">
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
        <One.iOS.Text text="Overlay base" />
        <One.iOS.Overlay.Content>
          <One.iOS.Button label="Overlay action" onPress={() => setOverlayTaps((value) => value + 1)} />
        </One.iOS.Overlay.Content>
      </One.iOS.Overlay>
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

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 90, paddingHorizontal: 20, gap: 12, backgroundColor: '#FFFFFF' },
  backgroundSlot: { width: 260, height: 100 },
  overlaySlot: { width: 260, height: 100 },
  insetSlot: { width: 260, height: 260 },
})
