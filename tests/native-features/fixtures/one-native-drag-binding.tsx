import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One, useNativeState } from 'one'

// a kinetic split: a drag bound to native state moves the divider and snaps it to
// the nearest detent natively. blocking the JavaScript thread must not stop the
// divider following the finger; the detent label updates once JavaScript runs.
const travel = 250

export default function OneNativeDragBinding() {
  const offset = useNativeState(0)
  const [detent, setDetent] = useState('none')
  const [blocked, setBlocked] = useState(0)

  return (
    <View style={styles.screen} testID="one-native-drag-binding-screen">
      <Pressable
        testID="one-native-drag-binding-block"
        style={styles.block}
        onPress={() => {
          // holds the JavaScript thread so a drag in this window runs on native alone.
          const end = Date.now() + 5000
          while (Date.now() < end) {}
          setBlocked((count) => count + 1)
        }}
      >
        <Text>Block JavaScript 5s</Text>
      </Pressable>
      <Text testID="one-native-drag-binding-detent">{`Detent: ${detent}`}</Text>
      <Text testID="one-native-drag-binding-blocked">{`Blocked: ${blocked}`}</Text>
      {/* the host covers the whole travel: content moved past it would not take touches. */}
      <One.iOS.Rectangle
        fill="#2F6FDB"
        testID="one-native-drag-binding-divider"
        style={styles.host}
        swiftStyle={{
          frameWithWidthAndHeightAndAlignment: { width: 320, height: 44, alignment: 'center' },
          offset: { x: 0, y: offset },
          gesture: {
            kind: 'drag',
            bind: { state: offset, axis: 'y', range: [-travel, travel] },
            snap: {
              targets: [-travel, 0, travel],
              animation: { kind: 'spring', response: 0.35, dampingFraction: 0.8 },
            },
            onEnded: ({ snapTarget }) => setDetent(String(snapTarget)),
          },
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 70, paddingHorizontal: 20, gap: 8, backgroundColor: '#FFFFFF' },
  block: { padding: 10, borderRadius: 8, backgroundColor: '#EEF1F6', alignSelf: 'flex-start' },
  host: { width: 320, height: 2 * travel + 44, backgroundColor: '#F4F6FA' },
})
