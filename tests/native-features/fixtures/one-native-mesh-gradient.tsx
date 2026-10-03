import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

type Mode = 'initial' | 'recolored' | 'warped' | 'background' | 'unsmoothed' | 'perceptual' | 'three-by-three'

const corners = [
  { x: 0, y: 0 }, { x: 1, y: 0 },
  { x: 0, y: 1 }, { x: 1, y: 1 },
] as const

const inner = [
  { x: 0.2, y: 0.2 }, { x: 0.8, y: 0.2 },
  { x: 0.2, y: 0.8 }, { x: 0.8, y: 0.8 },
] as const

const threeByThree = [
  { x: 0, y: 0 }, { x: 0.5, y: 0 }, { x: 1, y: 0 },
  { x: 0, y: 0.5 }, { x: 0.5, y: 0.5 }, { x: 1, y: 0.5 },
  { x: 0, y: 1 }, { x: 0.5, y: 1 }, { x: 1, y: 1 },
] as const

export default function OneNativeMeshGradientFixture() {
  const [mode, setMode] = useState<Mode>('initial')
  const colors = mode === 'recolored'
    ? ['#FFFF00', '#0000FF', '#00FF00', '#FF0000']
    : mode === 'three-by-three'
      ? ['#FF0000', '#FF8800', '#FFFF00', '#FF00FF', '#FFFFFF', '#00FF00', '#0000FF', '#00FFFF', '#000000']
      : ['#FF0000', '#00FF00', '#0000FF', '#FFFF00']
  const points = mode === 'three-by-three' ? threeByThree
    : mode === 'background' ? inner
      : mode === 'warped'
        ? [corners[0], { x: 0.65, y: 0.2 }, corners[2], corners[3]]
        : corners

  return (
    <View style={styles.screen} testID="one-native-mesh-gradient-screen">
      <Text>SwiftUI MeshGradient</Text>
      <View style={styles.underlay}>
        <One.iOS.MeshGradient
          meshWidth={mode === 'three-by-three' ? 3 : 2}
          meshHeight={mode === 'three-by-three' ? 3 : 2}
          points={points}
          colors={colors}
          background={mode === 'background' ? '#00FFFF' : '#00000000'}
          smoothsColors={mode !== 'unsmoothed'}
          colorSpace={mode === 'perceptual' ? 'perceptual' : 'device'}
          style={styles.preview}
          accessibilityLabel="Native mesh gradient preview"
          testID="one-native-mesh-gradient-native"
        />
      </View>
      <Text>{`Mode: ${mode}`}</Text>
      <Pressable testID="one-native-mesh-gradient-recolored" onPress={() => setMode('recolored')}><Text>Recolor vertices</Text></Pressable>
      <Pressable testID="one-native-mesh-gradient-warped" onPress={() => setMode('warped')}><Text>Warp a vertex</Text></Pressable>
      <Pressable testID="one-native-mesh-gradient-background" onPress={() => setMode('background')}><Text>Show background</Text></Pressable>
      <Pressable testID="one-native-mesh-gradient-unsmoothed" onPress={() => setMode('unsmoothed')}><Text>Disable color smoothing</Text></Pressable>
      <Pressable testID="one-native-mesh-gradient-perceptual" onPress={() => setMode('perceptual')}><Text>Use perceptual colors</Text></Pressable>
      <Pressable testID="one-native-mesh-gradient-three-by-three" onPress={() => setMode('three-by-three')}><Text>Three by three</Text></Pressable>
      <One.iOS.MeshGradient meshWidth={2} meshHeight={2} points={corners} colors={colors.slice(0, 4)} style={styles.decorative} testID="one-native-mesh-gradient-decorative" />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 70, paddingHorizontal: 20, gap: 12, backgroundColor: '#FFFFFF' },
  underlay: { width: 280, height: 180, backgroundColor: '#FFEE00' },
  preview: { width: 280, height: 180 },
  decorative: { width: 280, height: 30 },
})
