import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

const probe = 'One "native"\nPasteButton 🎉'

export default function OneNativePasteButton() {
  const [written, setWritten] = useState('idle')
  const [values, setValues] = useState<readonly string[]>([])
  const [count, setCount] = useState(0)
  const [disabled, setDisabled] = useState(false)

  return (
    <View style={styles.screen}>
      <Text>Clipboard: {written}</Text>
      <Text>Paste count: {count}</Text>
      <Text>Pasted: {values.join(' | ') || 'none'}</Text>
      <Text>Disabled: {String(disabled)}</Text>
      <Pressable
        testID="one-native-paste-seed"
        onPress={async () => setWritten(String(await One.Clipboard.setString(probe)))}
      >
        <Text>Set paste text</Text>
      </Pressable>
      <Pressable testID="one-native-paste-toggle-disabled" onPress={() => setDisabled((value) => !value)}>
        <Text>Toggle disabled</Text>
      </Pressable>
      <One.iOS.PasteButton
        testID="one-native-paste-action"
        disabled={disabled}
        onPaste={(next) => { setValues(next); setCount((n) => n + 1) }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16, paddingTop: 90, gap: 16, backgroundColor: '#fff' },
})
