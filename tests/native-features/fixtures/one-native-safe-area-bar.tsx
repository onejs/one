import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

export default function OneNativeSafeAreaBarFixture() {
  const [topTaps, setTopTaps] = useState(0)
  const [bottomTaps, setBottomTaps] = useState(0)

  return (
    <View style={styles.screen} testID="one-native-safe-area-bar-screen">
      <Text>{`Top taps: ${topTaps}`}</Text>
      <One.iOS.ViewSlot
        name="safeAreaBarWithVerticalEdge"
        options={{ edge: 'top' }}
        style={styles.host}
        testID="one-native-safe-area-bar-top"
      >
        <One.iOS.Text text="Top base" />
        <One.iOS.ViewSlot.Content>
          <One.iOS.Button label="Top bar action" onPress={() => setTopTaps((value) => value + 1)} />
        </One.iOS.ViewSlot.Content>
      </One.iOS.ViewSlot>
      <Text>{`Bottom taps: ${bottomTaps}`}</Text>
      <One.iOS.ViewSlot
        name="safeAreaBarWithVerticalEdge"
        options={{ edge: 'bottom' }}
        style={styles.host}
        testID="one-native-safe-area-bar-bottom"
      >
        <One.iOS.Text text="Bottom base" />
        <One.iOS.ViewSlot.Content>
          <One.iOS.Button label="Bottom bar action" onPress={() => setBottomTaps((value) => value + 1)} />
        </One.iOS.ViewSlot.Content>
      </One.iOS.ViewSlot>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 90, paddingHorizontal: 20, gap: 12, backgroundColor: '#FFFFFF' },
  host: { width: 280, height: 220 },
})
