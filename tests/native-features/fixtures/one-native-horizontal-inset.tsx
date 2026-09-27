import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

export default function OneNativeHorizontalInsetFixture() {
  const [leadingTaps, setLeadingTaps] = useState(0)
  const [trailingTaps, setTrailingTaps] = useState(0)

  return (
    <View style={styles.screen} testID="one-native-horizontal-inset-screen">
      <Text>{`Leading taps: ${leadingTaps}`}</Text>
      <One.iOS.ViewSlot
        name="safeAreaInsetWithHorizontalEdge"
        options={{ edge: 'leading' }}
        style={styles.host}
        testID="one-native-horizontal-inset-leading"
      >
        <One.iOS.Text text="Leading base" />
        <One.iOS.ViewSlot.Content>
          <One.iOS.Button label="Leading inset action" onPress={() => setLeadingTaps((value) => value + 1)} />
        </One.iOS.ViewSlot.Content>
      </One.iOS.ViewSlot>
      <Text>{`Trailing taps: ${trailingTaps}`}</Text>
      <One.iOS.ViewSlot
        name="safeAreaInsetWithHorizontalEdge"
        options={{ edge: 'trailing' }}
        style={styles.host}
        testID="one-native-horizontal-inset-trailing"
      >
        <One.iOS.Text text="Trailing base" />
        <One.iOS.ViewSlot.Content>
          <One.iOS.Button label="Trailing inset action" onPress={() => setTrailingTaps((value) => value + 1)} />
        </One.iOS.ViewSlot.Content>
      </One.iOS.ViewSlot>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 70, paddingHorizontal: 20, gap: 12, backgroundColor: '#FFFFFF' },
  host: { width: 280, height: 180 },
})
