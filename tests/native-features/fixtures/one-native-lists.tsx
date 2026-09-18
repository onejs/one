import { useState } from 'react'
import { Swift } from '@vxrn/native'
import { Pressable, StyleSheet, Text, View } from 'react-native'

const listStyles = ['automatic', 'plain', 'grouped'] as const

export default function OneNativeLists() {
  const [styleIndex, setStyleIndex] = useState(0)
  const [isOn, setIsOn] = useState(false)
  const [listTaps, setListTaps] = useState(0)
  const listStyle = listStyles[styleIndex]

  return (
    <View style={styles.screen} testID="one-native-lists-screen">
      <View style={styles.row}>
        <Pressable
          testID="one-native-list-style"
          style={styles.chip}
          onPress={() => setStyleIndex((index) => (index + 1) % listStyles.length)}
        >
          <Text>{`Style: ${listStyle}`}</Text>
        </Pressable>
      </View>

      <Swift.List listStyle={listStyle} style={styles.list}>
        <Swift.Section title="Fruits">
          <Swift.Text text="Apple" />
          <Swift.Text text="Banana" />
          <Swift.Text text="Orange" />
          <Swift.Button
            label="List button"
            onPress={() => setListTaps((count) => count + 1)}
          />
          <Swift.Toggle label="Ripe" isOn={isOn} onIsOnChange={setIsOn} />
        </Swift.Section>
        <Swift.Section title="Vegetables">
          <Swift.Text text="Carrot" />
          <Swift.Text text="Broccoli" />
        </Swift.Section>
      </Swift.List>

      <Swift.ScrollView style={styles.vertical}>
        <Swift.LazyVStack>
          {Array.from({ length: 30 }, (_, index) => (
            <Swift.Text key={index} text={`Row ${index + 1}`} />
          ))}
        </Swift.LazyVStack>
      </Swift.ScrollView>

      <Swift.ScrollView axes="horizontal" style={styles.horizontal}>
        <Swift.LazyHStack>
          {Array.from({ length: 20 }, (_, index) => (
            <Swift.Text key={index} text={`Chip ${index + 1}`} />
          ))}
        </Swift.LazyHStack>
      </Swift.ScrollView>

      <View style={styles.row}>
        <Text
          testID="one-native-list-taps"
          style={styles.line}
        >{`List taps: ${listTaps}`}</Text>
        <Text
          testID="one-native-list-toggle"
          style={styles.line}
        >{`IsOn: ${isOn}`}</Text>
        <Text
          testID="one-native-list-style-status"
          style={styles.line}
        >{`List style: ${listStyle}`}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, paddingTop: 70, gap: 8, backgroundColor: '#fff' },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  list: { flex: 1 },
  vertical: { height: 170 },
  horizontal: { height: 56 },
  line: { fontSize: 14 },
})
