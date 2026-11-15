import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { One, useNativeState } from 'one'

export default function OneNativeGeneratedOptions() {
  const text = useNativeState(
    'First line\nSecond line\nThird line\nFourth line\nFifth line'
  )
  const [upper, setUpper] = useState(3)
  const [height, setHeight] = useState(0)
  const [spacing, setSpacing] = useState(0)
  const [trailing, setTrailing] = useState(false)
  const [taps, setTaps] = useState(0)

  return (
    <ScrollView
      testID="one-native-generated-options-screen"
      contentContainerStyle={styles.screen}
    >
      <Text
        style={styles.label}
        testID="one-native-generated-options-limit"
      >{`Line limit: 1...${upper}`}</Text>
      <Text
        style={styles.label}
        testID="one-native-generated-options-height"
      >{`Field height: ${height.toFixed(2)}`}</Text>
      <One.iOS.TextField
        testID="one-native-generated-options-field"
        label="Multiline note"
        axis="vertical"
        text={text}
        onTextChange={(value) => text.set(value)}
        onLayout={({ nativeEvent }) => setHeight(nativeEvent.layout.height)}
        style={styles.field}
        swiftStyle={{
          colorScheme: 'light',
          lineLimitWithClosedRange: { limit: { lower: 1, upper } },
        }}
      />
      <Pressable
        testID="one-native-generated-options-lines"
        style={styles.chip}
        onPress={() => setUpper((value) => (value === 3 ? 5 : 3))}
      >
        <Text style={styles.label}>Change line limit</Text>
      </Pressable>
      <Text
        style={styles.label}
        testID="one-native-generated-options-inset"
      >{`Inset: ${trailing ? 'trailing' : 'leading'}; spacing: ${spacing}`}</Text>
      <View style={styles.buttons}>
        <Pressable
          testID="one-native-generated-options-spacing"
          style={styles.chip}
          onPress={() => setSpacing((value) => (value === 0 ? 24 : 0))}
        >
          <Text style={styles.label}>Change spacing</Text>
        </Pressable>
        <Pressable
          testID="one-native-generated-options-alignment"
          style={styles.chip}
          onPress={() => setTrailing((value) => !value)}
        >
          <Text style={styles.label}>Change alignment</Text>
        </Pressable>
      </View>
      <One.iOS.ViewSlot
        name="safeAreaInsetWithVerticalEdge"
        options={{
          edge: 'bottom',
          alignment: trailing ? 'trailing' : 'leading',
          spacing,
        }}
        style={styles.slot}
      >
        <One.iOS.Text
          text="Inset base"
          testID="one-native-generated-options-base"
          swiftStyle={{ colorScheme: 'light' }}
        />
        <One.iOS.ViewSlot.Content>
          <One.iOS.Button
            label="Inset action"
            testID="one-native-generated-options-action"
            onPress={() => setTaps((value) => value + 1)}
          />
        </One.iOS.ViewSlot.Content>
      </One.iOS.ViewSlot>
      <Text
        style={styles.label}
        testID="one-native-generated-options-taps"
      >{`Inset taps: ${taps}`}</Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flexGrow: 1, padding: 20, gap: 12, backgroundColor: '#FFFFFF' },
  label: { color: '#111111' },
  field: { width: 320 },
  slot: { width: 320, height: 180, backgroundColor: '#E6F0FF' },
  buttons: { flexDirection: 'row', gap: 12 },
  chip: { padding: 12, borderRadius: 8, backgroundColor: '#EEEEEE' },
})
