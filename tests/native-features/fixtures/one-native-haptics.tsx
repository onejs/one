import { Haptics, isHapticsAvailable } from '@vxrn/native/haptics'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

// exercises One.UI.Haptics end to end: the module-present marker proves the
// native module resolved, and one button per verb proves each call crosses
// the bridge without a redbox. taps record into labels because RN Text
// testIDs vanish from the accessibility snapshot while Pressable IDs
// survive; feel itself is human-verified on device.
const verbs = [
  { id: 'selection', run: () => Haptics.selection() },
  { id: 'impact-light', run: () => Haptics.impact('light') },
  { id: 'impact-medium', run: () => Haptics.impact('medium') },
  { id: 'impact-heavy', run: () => Haptics.impact('heavy') },
  { id: 'impact-soft', run: () => Haptics.impact('soft') },
  { id: 'impact-rigid', run: () => Haptics.impact('rigid') },
  { id: 'notification-success', run: () => Haptics.notification('success') },
  { id: 'notification-warning', run: () => Haptics.notification('warning') },
  { id: 'notification-error', run: () => Haptics.notification('error') },
] as const

export default function OneNativeHaptics() {
  const [available] = useState(() => {
    try {
      return isHapticsAvailable()
    } catch {
      return false
    }
  })
  const [last, setLast] = useState('none')
  const [error, setError] = useState('none')

  return (
    <View style={styles.screen}>
      <Text>{`Module: ${available ? 'available' : 'unavailable'}`}</Text>
      <Text>{`Last: ${last}`}</Text>
      <Text>{`Error: ${error}`}</Text>
      {verbs.map((verb) => (
        <Pressable
          key={verb.id}
          testID={`one-native-haptics-${verb.id}`}
          style={styles.chip}
          onPress={() => {
            try {
              verb.run()
              setLast(verb.id)
            } catch (e) {
              setError(e instanceof Error ? e.message : String(e))
            }
          }}
        >
          <Text>{verb.id}</Text>
        </Pressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 8 },
  chip: { padding: 12, backgroundColor: '#eee', borderRadius: 8 },
})
