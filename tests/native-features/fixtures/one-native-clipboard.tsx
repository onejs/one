import { Clipboard } from '@vxrn/native'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

// exercises the clipboard api against the real pasteboard: write a known
// string, read it back, and check presence. results travel as labels
// because RN Text testIDs vanish from the accessibility snapshot while
// Pressable IDs survive. the app reads back its own write, so no os paste
// prompt can appear mid-suite.
const probe = 'one-native-clipboard-probe'

export default function OneNativeClipboard() {
  const [written, setWritten] = useState('none')
  const [read, setRead] = useState('none')
  const [has, setHas] = useState('none')
  return (
    <View style={styles.screen}>
      <Text>{`Written: ${written}`}</Text>
      <Text>{`Read: ${read}`}</Text>
      <Text>{`Has: ${has}`}</Text>
      <Pressable
        testID="one-native-clipboard-set"
        style={styles.chip}
        onPress={async () => setWritten(String(await Clipboard.setString(probe)))}
      >
        <Text>Set probe string</Text>
      </Pressable>
      <Pressable
        testID="one-native-clipboard-get"
        style={styles.chip}
        onPress={async () => setRead(await Clipboard.getString())}
      >
        <Text>Get string</Text>
      </Pressable>
      <Pressable
        testID="one-native-clipboard-has"
        style={styles.chip}
        onPress={async () => setHas(String(await Clipboard.hasString()))}
      >
        <Text>Has string</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 12 },
  chip: { padding: 12, backgroundColor: '#eee', borderRadius: 8 },
})
