import {
  SafeAreaProvider,
  SafeAreaView,
  initialWindowMetrics,
  useSafeAreaFrame,
  useSafeAreaInsets,
} from '@vxrn/safe-area'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

// exercises the first-party safe-area takeover: our provider measures
// insets natively, the hooks read them through our context, and the view
// applies them. readings travel as labels because RN Text testIDs vanish
// from the accessibility snapshot while Pressable IDs survive. the nested
// provider and the text input exist for the Android nested/IME coverage;
// the iOS suite only reads the outer labels.
function Readout({ prefix }: { prefix: string }) {
  const insets = useSafeAreaInsets()
  const frame = useSafeAreaFrame()
  return (
    <View>
      <Text>{`${prefix}Insets: ${insets.top} ${insets.right} ${insets.bottom} ${insets.left}`}</Text>
      <Text>{`${prefix}Frame: ${frame.width}x${frame.height}`}</Text>
    </View>
  )
}

export default function OneNativeSafeArea() {
  const [topOnly, setTopOnly] = useState(false)
  const [input, setInput] = useState('')
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.screen} edges={topOnly ? ['top'] : undefined}>
        <Readout prefix="" />
        <Text>{`Initial: ${initialWindowMetrics ? 'set' : 'null'}`}</Text>
        <Text>{`Edges: ${topOnly ? 'top' : 'all'}`}</Text>
        <TextInput
          testID="one-native-safe-area-input"
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="ime probe"
        />
        <SafeAreaProvider>
          <Readout prefix="Nested" />
        </SafeAreaProvider>
        <Pressable
          testID="one-native-safe-area-edges"
          style={styles.chip}
          onPress={() => setTopOnly((value) => !value)}
        >
          <Text>Toggle edges</Text>
        </Pressable>
      </SafeAreaView>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16 },
  chip: { padding: 12, backgroundColor: '#eee', borderRadius: 8 },
  input: { borderWidth: 1, borderColor: '#999', padding: 8, borderRadius: 8 },
})
