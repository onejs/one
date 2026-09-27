import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

export default function OneNativeLinearGradientFixture() {
  const [reversed, setReversed] = useState(false)
  const colors = reversed ? (['#1144DD', '#FF3311'] as const) : (['#FF3311', '#1144DD'] as const)

  return (
    <View style={styles.screen} testID="one-native-linear-gradient-screen">
      <Text>React Native backgroundImage</Text>
      <View
        style={[
          styles.preview,
          {
            backgroundImage: [{
              type: 'linear-gradient',
              direction: 'to bottom',
              colorStops: [{ color: '#FF3311', positions: ['0%'] }, { color: '#1144DD', positions: ['100%'] }],
            }],
          },
        ]}
        testID="one-native-linear-gradient-react-native"
      />
      <Text>SwiftUI LinearGradient</Text>
      <One.iOS.LinearGradient
        colors={colors}
        startPoint={{ x: 0.5, y: 0 }}
        endPoint={{ x: 0.5, y: 1 }}
        style={styles.preview}
        testID="one-native-linear-gradient-native"
      />
      <Pressable onPress={() => setReversed((value) => !value)} testID="one-native-linear-gradient-reverse">
        <Text>{`Reverse native: ${reversed ? 'yes' : 'no'}`}</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 70, paddingHorizontal: 20, gap: 12, backgroundColor: '#FFFFFF' },
  preview: { width: 280, height: 150 },
})
