import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

type Mode = 'initial' | 'rotated' | 'moved' | 'reversed' | 'three' | 'single' | 'alpha' | 'empty'

export default function OneNativeAngularGradientFixture() {
  const [mode, setMode] = useState<Mode>('initial')
  const colors = mode === 'empty' ? []
    : mode === 'single' ? ['#22BB55']
    : mode === 'alpha' ? ['#FF331100', '#1144DDFF']
    : mode === 'three' ? ['#FF3311', '#22BB55', '#1144DD']
    : mode === 'reversed' ? ['#1144DD', '#FF3311']
    : ['#FF3311', '#1144DD']

  return (
    <View style={styles.screen} testID="one-native-angular-gradient-screen">
      <Text>SwiftUI AngularGradient</Text>
      <View style={styles.underlay}>
        <One.iOS.AngularGradient
          colors={colors}
          center={mode === 'moved' ? { x: 0.25, y: 0.25 } : { x: 0.5, y: 0.5 }}
          angle={mode === 'rotated' ? { radians: Math.PI } : { radians: 0 }}
          style={styles.preview}
          accessibilityLabel="Native angular gradient preview"
          testID="one-native-angular-gradient-native"
        />
      </View>
      <Text>{`Mode: ${mode}`}</Text>
      <Pressable testID="one-native-angular-gradient-rotated" onPress={() => setMode('rotated')}><Text>Rotate half turn</Text></Pressable>
      <Pressable testID="one-native-angular-gradient-moved" onPress={() => setMode('moved')}><Text>Move center</Text></Pressable>
      <Pressable testID="one-native-angular-gradient-reversed" onPress={() => setMode('reversed')}><Text>Reverse colors</Text></Pressable>
      <Pressable testID="one-native-angular-gradient-three" onPress={() => setMode('three')}><Text>Three colors</Text></Pressable>
      <Pressable testID="one-native-angular-gradient-single" onPress={() => setMode('single')}><Text>Single color</Text></Pressable>
      <Pressable testID="one-native-angular-gradient-alpha" onPress={() => setMode('alpha')}><Text>Transparent first color</Text></Pressable>
      <Pressable testID="one-native-angular-gradient-empty" onPress={() => setMode('empty')}><Text>Empty colors</Text></Pressable>
      <One.iOS.AngularGradient
        colors={['#FF3311', '#1144DD']}
        style={styles.decorative}
        testID="one-native-angular-gradient-decorative"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 70, paddingHorizontal: 20, gap: 12, backgroundColor: '#FFFFFF' },
  underlay: { width: 280, height: 150, backgroundColor: '#FFEE00' },
  preview: { width: 280, height: 150 },
  decorative: { width: 280, height: 40 },
})
