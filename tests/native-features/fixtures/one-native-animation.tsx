import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One, useNativeState } from 'one'

// Swift.withAnimation: the animated slider glides between its ends while the
// plain write jumps, and the completion count shows the transaction finished.
export default function OneNativeAnimation() {
  const level = useNativeState(0)
  const [completions, setCompletions] = useState(0)
  const [error, setError] = useState('')
  const next = () => (level.get() === 0 ? 100 : 0)

  return (
    <View style={styles.screen} testID="one-native-animation-screen">
      <One.iOS.Slider
        label="Level"
        value={level}
        onValueChange={() => {}}
        in={[0, 100]}
        testID="one-native-animation-slider"
      />
      <View style={styles.row}>
        <Pressable
          testID="one-native-animation-animate"
          style={styles.chip}
          onPress={() =>
            One.iOS.withAnimation('linear', () => level.set(next()), () =>
              setCompletions((count) => count + 1)
            )
          }
        >
          <Text>Animate</Text>
        </Pressable>
        <Pressable
          testID="one-native-animation-jump"
          style={styles.chip}
          onPress={() => level.set(next())}
        >
          <Text>Jump</Text>
        </Pressable>
        <Pressable
          testID="one-native-animation-nested"
          style={styles.chip}
          onPress={() => {
            try {
              One.iOS.withAnimation('linear', () => One.iOS.withAnimation(null, () => {}))
            } catch (caught) {
              setError(caught instanceof Error ? caught.message : String(caught))
            }
          }}
        >
          <Text>Nested</Text>
        </Pressable>
      </View>
      <View style={styles.row}>
        <Pressable
          testID="one-native-animation-duration"
          style={styles.chip}
          onPress={() =>
            One.iOS.withAnimation({ kind: 'easeOut', duration: 2 }, () => level.set(next()), () =>
              setCompletions((count) => count + 1)
            )
          }
        >
          <Text>Ease out, 2 seconds</Text>
        </Pressable>
        <Pressable
          testID="one-native-animation-spring"
          style={styles.chip}
          onPress={() =>
            One.iOS.withAnimation(
              { kind: 'spring', response: 1, dampingFraction: 0.7 },
              () => level.set(next()),
              () => setCompletions((count) => count + 1)
            )
          }
        >
          <Text>Configured spring</Text>
        </Pressable>
      </View>
      <Text testID="one-native-animation-status" style={styles.line}>
        {`Level: ${level.value} · Completions: ${completions}`}
      </Text>
      <Text testID="one-native-animation-error" style={styles.line}>
        {error === '' ? 'Error: none' : `Error: ${error}`}
      </Text>
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
