import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

export default function OneNativeHorizontalBarFixture() {
  const [leadingTaps, setLeadingTaps] = useState(0)
  const [trailingTaps, setTrailingTaps] = useState(0)

  return (
    <View style={styles.screen} testID="one-native-horizontal-bar-screen">
      <Text>{`Leading bar taps: ${leadingTaps}`}</Text>
      <One.iOS.ViewSlot
        name="safeAreaBarWithHorizontalEdge"
        options={{ edge: 'leading' }}
        style={styles.host}
        testID="one-native-horizontal-bar-leading"
      >
        <One.iOS.Text text="Leading bar base" />
        <One.iOS.ViewSlot.Content>
          <One.iOS.Button label="Leading bar action" onPress={() => setLeadingTaps((value) => value + 1)} />
        </One.iOS.ViewSlot.Content>
      </One.iOS.ViewSlot>
      <Text>{`Trailing bar taps: ${trailingTaps}`}</Text>
      <One.iOS.ViewSlot
        name="safeAreaBarWithHorizontalEdge"
        options={{ edge: 'trailing' }}
        style={styles.host}
        testID="one-native-horizontal-bar-trailing"
      >
        <One.iOS.Text text="Trailing bar base" />
        <One.iOS.ViewSlot.Content>
          <One.iOS.Button label="Trailing bar action" onPress={() => setTrailingTaps((value) => value + 1)} />
        </One.iOS.ViewSlot.Content>
      </One.iOS.ViewSlot>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 70, paddingHorizontal: 20, gap: 12, backgroundColor: '#FFFFFF' },
  host: { width: 280, height: 180 },
})
