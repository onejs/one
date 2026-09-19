import {
  SafeAreaProvider,
  SafeAreaView,
  initialWindowMetrics,
  useSafeAreaFrame,
  useSafeAreaInsets,
} from '@vxrn/safe-area'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

// exercises the first-party safe-area takeover: our provider measures
// insets natively, the hooks read them through our context, and the view
// applies them. readings travel as labels because RN Text testIDs vanish
// from the accessibility snapshot while Pressable IDs survive.
function Readout() {
  const insets = useSafeAreaInsets()
  const frame = useSafeAreaFrame()
  return (
    <View>
      <Text>{`Insets: ${insets.top} ${insets.right} ${insets.bottom} ${insets.left}`}</Text>
      <Text>{`Frame: ${frame.width}x${frame.height}`}</Text>
      <Text>{`Initial: ${initialWindowMetrics ? 'set' : 'null'}`}</Text>
    </View>
  )
}

export default function OneNativeSafeArea() {
  const [topOnly, setTopOnly] = useState(false)
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.screen} edges={topOnly ? ['top'] : undefined}>
        <Readout />
        <Text>{`Edges: ${topOnly ? 'top' : 'all'}`}</Text>
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
})
