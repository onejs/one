import { useState } from 'react'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { One, useNativeState } from 'one'

export default function OneNativeState() {
  const name = useNativeState('')
  const flag = useNativeState(false)
  const [disconnected, setDisconnected] = useState(false)
  const untouched = useNativeState('untouched')

  if (Platform.OS === 'android') {
    return (
      <One.Android.Column spacing={12} style={{ flex: 1, padding: 16 }}>
        <One.Android.TextField
          label="Name"
          text={name}
          onTextChange={() => {}}
          testID="one-native-state-field"
        />
        <One.Android.TextField
          label="Name copy"
          text={disconnected ? untouched : name}
          onTextChange={() => {}}
          testID="one-native-state-shared-field"
        />
        <One.Android.TextField
          label="Independent"
          text={untouched}
          onTextChange={() => {}}
          disabled
          testID="one-native-state-independent-field"
        />
        <One.Android.Text
          text={`Name: ${name.value} · Get: ${name.get()} · Independent: ${untouched.get()}`}
        />
        <One.Android.Text text={`Flag: ${flag.value}`} />
        <One.Android.Switch
          label="First"
          isOn={flag.value}
          onIsOnChange={flag.set}
          testID="one-native-state-switch"
        />
        <One.Android.Switch
          label="Second"
          isOn={flag.value}
          onIsOnChange={flag.set}
          testID="one-native-state-switch-copy"
        />
        <One.Android.Button
          label="Set from JavaScript"
          testID="one-native-state-set"
          onPress={() => name.set('ada')}
        />
        <One.Android.Button
          label="Disconnect shared field"
          testID="one-native-state-disconnect"
          onPress={() => setDisconnected(true)}
        />
      </One.Android.Column>
    )
  }

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
