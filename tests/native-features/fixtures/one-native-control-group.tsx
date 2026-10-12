import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

export default function OneNativeControlGroupFixture() {
  const [taps, setTaps] = useState(0)
  const [nestedTaps, setNestedTaps] = useState(0)
  const [boundedTaps, setBoundedTaps] = useState(0)

  return (
    <View style={styles.screen} testID="one-native-control-screen">
      <Text>{`Taps: ${taps}`}</Text>
      <One.iOS.ControlGroup style={styles.group} testID="one-native-control-standalone">
        <One.iOS.Button label="Add" systemImage="plus" testID="one-native-control-add" onPress={() => setTaps((value) => value + 1)} />
        <One.iOS.Button label="Star" systemImage="star" testID="one-native-control-star" onPress={() => setTaps((value) => value + 1)} />
      </One.iOS.ControlGroup>
      <Text testID="one-native-control-after">After control</Text>

      <Text>{`Nested taps: ${nestedTaps}`}</Text>
      <One.iOS.Host style={styles.group} testID="one-native-control-host">
        <One.iOS.ControlGroup>
          <One.iOS.Button label="Nested add" systemImage="plus" testID="one-native-control-nested-add" onPress={() => setNestedTaps((value) => value + 1)} />
        </One.iOS.ControlGroup>
      </One.iOS.Host>
      <Text testID="one-native-control-after-nested">After nested</Text>

      <Text>{`Bounded taps: ${boundedTaps}`}</Text>
      <One.iOS.ControlGroup style={styles.bounded} testID="one-native-control-bounded">
        <One.iOS.Button label="Bounded add" systemImage="plus" testID="one-native-control-bounded-add" onPress={() => setBoundedTaps((value) => value + 1)} />
      </One.iOS.ControlGroup>
      <Text testID="one-native-control-after-bounded">After bounded</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 90, paddingHorizontal: 20, gap: 12, backgroundColor: '#FFFFFF' },
  group: { width: 260 },
  bounded: { width: 260, height: 80 },
})
