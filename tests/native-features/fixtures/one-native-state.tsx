import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

export default function OneNativeState() {
  const name = One.UI.useNativeState('')
  const flag = One.UI.useNativeState(false)

  return (
    <View style={styles.screen} testID="one-native-state-screen">
      <One.iOS.TextField
        label="Name"
        text={name.value}
        onTextChange={name.set}
        autocorrectionDisabled
        testID="one-native-state-field"
      />
      <One.iOS.Text
        text={name.value === '' ? 'Mirror: empty' : `Mirror: ${name.value}`}
      />
      <One.iOS.Toggle label="First" isOn={flag.value} onIsOnChange={flag.set} />
      <One.iOS.Toggle label="Second" isOn={flag.value} onIsOnChange={flag.set} />
      <Pressable
        testID="one-native-state-set"
        style={styles.chip}
        onPress={() => {
          name.set('grace')
          flag.set(true)
        }}
      >
        <Text>Set both</Text>
      </Pressable>
      <View style={styles.row}>
        <Text
          testID="one-native-state-flag"
          style={styles.line}
        >{`Flag: ${flag.value}`}</Text>
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
    alignSelf: 'flex-start',
  },
  line: { fontSize: 14 },
})
