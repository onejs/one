import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

export default function OneNativeTabSlot() {
  const [selection, setSelection] = useState('home')
  const [slotTaps, setSlotTaps] = useState(0)

  return (
    <View style={styles.screen} testID="one-native-tab-slot-screen">
      <Text>{`Selected tab: ${selection}`}</Text>
      <Text>{`Slot taps: ${slotTaps}`}</Text>
      <One.iOS.Tabs
        selection={selection}
        onSelectionChange={setSelection}
        style={{ flex: 1 }}
        testID="one-native-tab-slot-tabs"
      >
        <One.iOS.Tab id="home" title="Home" systemImage="house">
          <View style={styles.page} testID="one-native-tab-slot-home">
            <Text>Home page</Text>
            <Text>Before empty</Text>
            <One.iOS.EmptyView testID="one-native-tab-slot-empty" />
            <Text>After empty</Text>
            <One.iOS.HStack spacing={12} style={{ width: 240 }}>
              <One.iOS.Text text="Native A" testID="one-native-tab-slot-native-a" />
              <One.iOS.EmptyView testID="one-native-tab-slot-composed-empty" />
              <One.iOS.Text text="Native B" testID="one-native-tab-slot-native-b" />
            </One.iOS.HStack>
            <One.iOS.HStack spacing={12} style={{ width: 240 }}>
              <One.iOS.Text text="Control A" testID="one-native-tab-slot-control-a" />
              <One.iOS.Text text="Control B" testID="one-native-tab-slot-control-b" />
            </One.iOS.HStack>
          </View>
        </One.iOS.Tab>
        <One.iOS.Tab id="other" title="Other" systemImage="star">
          <View style={styles.page} testID="one-native-tab-slot-other">
            <Text>Other page</Text>
          </View>
        </One.iOS.Tab>
        <One.iOS.TabViewSlot name="tabViewBottomAccessory" height={50}>
          <Pressable
            style={styles.slot}
            testID="one-native-tab-slot-action"
            onPress={() => setSlotTaps((value) => value + 1)}
          >
            <Text>Slot action</Text>
          </Pressable>
        </One.iOS.TabViewSlot>
      </One.iOS.Tabs>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 70, backgroundColor: '#F5F5F7' },
  page: { flex: 1, padding: 16, gap: 8 },
  slot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
})
