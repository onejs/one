import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

type Mode = 'initial' | 'reversed' | 'moved' | 'wide' | 'inner' | 'empty'

export default function OneNativeRadialGradientFixture() {
  const [mode, setMode] = useState<Mode>('initial')
  const colors = mode === 'empty' ? [] : mode === 'reversed'
    ? ['#1144DD', '#FF3311'] : ['#FF3311', '#1144DD']

  return (
    <View style={styles.screen} testID="one-native-radial-gradient-screen">
      <Text>SwiftUI RadialGradient</Text>
      <View style={styles.underlay}>
        <One.iOS.RadialGradient
          colors={colors}
          center={mode === 'moved' ? { x: 0.25, y: 0.5 } : { x: 0.5, y: 0.5 }}
          startRadius={mode === 'inner' ? 40 : 0}
          endRadius={mode === 'wide' ? 180 : 80}
          style={styles.preview}
          accessibilityLabel="Native radial gradient preview"
          testID="one-native-radial-gradient-native"
        />
      </View>
      <Text>{`Mode: ${mode}`}</Text>
      <Pressable testID="one-native-radial-gradient-reversed" onPress={() => setMode('reversed')}><Text>Reverse colors</Text></Pressable>
      <Pressable testID="one-native-radial-gradient-moved" onPress={() => setMode('moved')}><Text>Move center</Text></Pressable>
      <Pressable testID="one-native-radial-gradient-wide" onPress={() => setMode('wide')}><Text>Widen end radius</Text></Pressable>
      <Pressable testID="one-native-radial-gradient-inner" onPress={() => setMode('inner')}><Text>Widen start radius</Text></Pressable>
      <Pressable testID="one-native-radial-gradient-empty" onPress={() => setMode('empty')}><Text>Empty colors</Text></Pressable>
      <One.iOS.RadialGradient colors={['#FF3311', '#1144DD']} endRadius={80} style={styles.decorative} testID="one-native-radial-gradient-decorative" />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 70, paddingHorizontal: 20, gap: 12, backgroundColor: '#FFFFFF' },
  underlay: { width: 280, height: 150, backgroundColor: '#FFEE00' },
  preview: { width: 280, height: 150 },
  decorative: { width: 280, height: 40 },
})
