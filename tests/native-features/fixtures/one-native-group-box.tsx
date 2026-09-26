import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

export default function OneNativeGroupBox() {
  const [renamed, setRenamed] = useState(false)
  const [taps, setTaps] = useState(0)
  return (
    <View style={styles.screen}>
      <Text>Box taps: {taps}</Text>
      <Pressable testID="one-native-group-box-rename" onPress={() => setRenamed((value) => !value)}>
        <Text>Rename group box</Text>
      </Pressable>
      <One.iOS.GroupBox label={renamed ? 'Updated account' : 'Account'} testID="one-native-group-box-labeled">
        <One.iOS.Text text="Inner value" />
        <One.iOS.Button label="Run inner" onPress={() => setTaps((value) => value + 1)} />
      </One.iOS.GroupBox>
      <One.iOS.GroupBox testID="one-native-group-box-unlabeled">
        <One.iOS.Text text="No title content" />
      </One.iOS.GroupBox>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16, paddingTop: 90, gap: 12, backgroundColor: '#fff' },
})
