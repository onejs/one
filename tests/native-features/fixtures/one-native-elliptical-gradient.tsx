import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

type Mode = 'initial' | 'reversed' | 'moved' | 'wide' | 'inner' | 'single' | 'alpha' | 'three' | 'empty'

export default function OneNativeEllipticalGradientFixture() {
  const [mode, setMode] = useState<Mode>('initial')
  const colors = mode === 'empty' ? []
    : mode === 'single' ? ['#22BB55']
    : mode === 'alpha' ? ['#FF331100', '#1144DDFF']
    : mode === 'three' ? ['#FF3311', '#22BB55', '#1144DD']
    : mode === 'reversed' ? ['#1144DD', '#FF3311']
    : ['#FF3311', '#1144DD']

  return (
    <View style={styles.screen} testID="one-native-elliptical-gradient-screen">
      <Text>SwiftUI EllipticalGradient</Text>
      <View style={styles.underlay}>
        <One.iOS.EllipticalGradient
          colors={colors}
          center={mode === 'moved' ? { x: 0.25, y: 0.5 } : { x: 0.5, y: 0.5 }}
          startRadiusFraction={mode === 'inner' ? 0.25 : 0}
          endRadiusFraction={mode === 'wide' ? 0.85 : 0.5}
          style={styles.preview}
          accessibilityLabel="Native elliptical gradient preview"
          testID="one-native-elliptical-gradient-native"
        />
      </View>
      <Text>{`Mode: ${mode}`}</Text>
      <Pressable testID="one-native-elliptical-gradient-reversed" onPress={() => setMode('reversed')}><Text>Reverse colors</Text></Pressable>
      <Pressable testID="one-native-elliptical-gradient-moved" onPress={() => setMode('moved')}><Text>Move center</Text></Pressable>
      <Pressable testID="one-native-elliptical-gradient-wide" onPress={() => setMode('wide')}><Text>Widen end fraction</Text></Pressable>
      <Pressable testID="one-native-elliptical-gradient-inner" onPress={() => setMode('inner')}><Text>Widen start fraction</Text></Pressable>
      <Pressable testID="one-native-elliptical-gradient-single" onPress={() => setMode('single')}><Text>Single color</Text></Pressable>
      <Pressable testID="one-native-elliptical-gradient-alpha" onPress={() => setMode('alpha')}><Text>Transparent center</Text></Pressable>
      <Pressable testID="one-native-elliptical-gradient-three" onPress={() => setMode('three')}><Text>Three colors</Text></Pressable>
      <Pressable testID="one-native-elliptical-gradient-empty" onPress={() => setMode('empty')}><Text>Empty colors</Text></Pressable>
      <One.iOS.EllipticalGradient colors={['#FF3311', '#1144DD']} style={styles.decorative} testID="one-native-elliptical-gradient-decorative" />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 70, paddingHorizontal: 20, gap: 12, backgroundColor: '#FFFFFF' },
  underlay: { width: 280, height: 150, backgroundColor: '#FFEE00' },
  preview: { width: 280, height: 150 },
  decorative: { width: 280, height: 40 },
})
