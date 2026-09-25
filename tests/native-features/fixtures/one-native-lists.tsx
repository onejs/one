import { useState } from 'react'
import { Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native'
import { One } from 'one'

const listStyles = ['automatic', 'plain', 'grouped'] as const

export default function OneNativeLists() {
  const [styleIndex, setStyleIndex] = useState(0)
  const [isOn, setIsOn] = useState(false)
  const [listTaps, setListTaps] = useState(0)
  const listStyle = listStyles[styleIndex]
  // swiftui content adapts to the scheme, so the react chrome around it must too:
  // a hardcoded white screen leaves dark-mode rows as white text on white.
  const dark = useColorScheme() === 'dark'
  const screenColor = dark ? '#000' : '#fff'
  const textColor = dark ? '#fff' : '#000'
  const chipColor = dark ? '#1c1c1e' : '#eee'

  return (
    <View
      style={[styles.screen, { backgroundColor: screenColor }]}
      testID="one-native-lists-screen"
    >
      <View style={styles.row}>
        <Pressable
          testID="one-native-list-style"
          style={[styles.chip, { backgroundColor: chipColor }]}
          onPress={() => setStyleIndex((index) => (index + 1) % listStyles.length)}
        >
          <Text style={{ color: textColor }}>{`Style: ${listStyle}`}</Text>
        </Pressable>
      </View>

      <One.iOS.List listStyle={listStyle} style={styles.list}>
        <One.iOS.Section title="Fruits">
          <One.iOS.Text text="Apple" />
          <One.iOS.Text text="Banana" />
          <One.iOS.Text text="Orange" />
          <One.iOS.Button
            label="List button"
            onPress={() => setListTaps((count) => count + 1)}
          />
          <One.iOS.Toggle label="Ripe" isOn={isOn} onIsOnChange={setIsOn} />
        </One.iOS.Section>
        <One.iOS.Section title="Vegetables">
          <One.iOS.Text text="Carrot" />
          <One.iOS.Text text="Broccoli" />
        </One.iOS.Section>
      </One.iOS.List>

      <One.iOS.ScrollView style={styles.vertical}>
        <One.iOS.LazyVStack>
          {Array.from({ length: 30 }, (_, index) => (
            <One.iOS.Text key={index} text={`Row ${index + 1}`} />
          ))}
        </One.iOS.LazyVStack>
      </One.iOS.ScrollView>

      <One.iOS.ScrollView axes="horizontal" style={styles.horizontal}>
        <One.iOS.LazyHStack>
          {Array.from({ length: 20 }, (_, index) => (
            <One.iOS.Text key={index} text={`Chip ${index + 1}`} />
          ))}
        </One.iOS.LazyHStack>
      </One.iOS.ScrollView>

      <View style={styles.row}>
        <Text
          testID="one-native-list-taps"
          style={[styles.line, { color: textColor }]}
        >{`List taps: ${listTaps}`}</Text>
        <Text
          testID="one-native-list-toggle"
          style={[styles.line, { color: textColor }]}
        >{`IsOn: ${isOn}`}</Text>
        <Text
          testID="one-native-list-style-status"
          style={[styles.line, { color: textColor }]}
        >{`List style: ${listStyle}`}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, paddingTop: 70, gap: 8 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  list: { flex: 1 },
  vertical: { height: 150 },
  horizontal: { height: 56 },
  line: { fontSize: 14 },
})
