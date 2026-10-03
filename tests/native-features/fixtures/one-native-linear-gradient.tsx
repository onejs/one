import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

export default function OneNativeLinearGradientFixture() {
  const [mode, setMode] = useState<'initial' | 'reversed' | 'single' | 'horizontal' | 'alpha' | 'three' | 'empty'>('initial')
  const colors = mode === 'empty' ? ([] as const)
    : mode === 'single' ? (['#22BB55'] as const)
    : mode === 'reversed' ? (['#1144DD', '#FF3311'] as const)
    : mode === 'alpha' ? (['#FF331100', '#1144DDFF'] as const)
    : mode === 'three' ? (['#FF3311', '#22BB55', '#1144DD'] as const)
    : (['#FF3311', '#1144DD'] as const)

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
      <View style={styles.nativeUnderlay}>
        <One.iOS.LinearGradient
          colors={colors}
          startPoint={mode === 'horizontal' ? { x: 0, y: 0.5 } : { x: 0.5, y: 0 }}
          endPoint={mode === 'horizontal' ? { x: 1, y: 0.5 } : { x: 0.5, y: 1 }}
          style={styles.preview}
          accessibilityLabel="Native gradient preview"
          testID="one-native-linear-gradient-native"
        />
      </View>
      <Text>{`Mode: ${mode}`}</Text>
      <Pressable onPress={() => setMode('reversed')} testID="one-native-linear-gradient-reverse">
        <Text>Reverse native</Text>
      </Pressable>
      <Pressable onPress={() => setMode('single')} testID="one-native-linear-gradient-single">
        <Text>Single native</Text>
      </Pressable>
      <Pressable onPress={() => setMode('horizontal')} testID="one-native-linear-gradient-horizontal">
        <Text>Horizontal native</Text>
      </Pressable>
      <Pressable onPress={() => setMode('alpha')} testID="one-native-linear-gradient-alpha">
        <Text>Alpha native</Text>
      </Pressable>
      <Pressable onPress={() => setMode('three')} testID="one-native-linear-gradient-three">
        <Text>Three colors native</Text>
      </Pressable>
      <Pressable onPress={() => setMode('empty')} testID="one-native-linear-gradient-empty">
        <Text>Empty colors native</Text>
      </Pressable>
      <One.iOS.LinearGradient colors={['#FF3311', '#1144DD']} style={styles.decorative} testID="one-native-linear-gradient-decorative" />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 70, paddingHorizontal: 20, gap: 12, backgroundColor: '#FFFFFF' },
  preview: { width: 280, height: 150 },
  nativeUnderlay: { width: 280, height: 150, backgroundColor: '#FFEE00' },
  decorative: { width: 280, height: 40 },
})
