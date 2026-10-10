import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

export default function OneNativeControlSize() {
  const [size, setSize] = useState<'mini' | 'extraLarge'>('mini')
  const [taps, setTaps] = useState(0)

  return (
    <View style={styles.screen} testID="one-native-control-size-screen">
      <Text>{`Control size: ${size}`}</Text>
      <Pressable
        testID="one-native-control-size-toggle"
        onPress={() => setSize((value) => value === 'mini' ? 'extraLarge' : 'mini')}
      >
        <Text>Toggle control size</Text>
      </Pressable>
      <One.iOS.Host controlSize={size} style={styles.control}>
        <One.iOS.Button
          label="Inherited size"
          buttonStyle="borderedProminent"
          testID="one-native-control-size-inherited"
          onPress={() => setTaps((value) => value + 1)}
        />
      </One.iOS.Host>
      <One.iOS.Button
        label="Direct size"
        buttonStyle="borderedProminent"
        swiftStyle={{ controlSize: size }}
        style={styles.control}
        testID="one-native-control-size-direct"
        onPress={() => setTaps((value) => value + 1)}
      />
      <Text>{`Control taps: ${taps}`}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 90, paddingHorizontal: 20, gap: 16, backgroundColor: '#FFFFFF' },
  control: { width: 200 },
})
