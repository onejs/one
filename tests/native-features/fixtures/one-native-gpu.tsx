import { Pressable, StyleSheet, Text, View } from 'react-native'

// web never mounts the gpu fixture: react-native-webgpu touches browser
// globals at import, so the real fixture lives in one-native-gpu.native.tsx
// and web resolves here. the route stays registered on both platforms.
export default function OneNativeGpu() {
  return (
    <View style={styles.screen} testID="one-native-gpu-screen">
      <Text style={styles.text}>Gpu fixture is native-only.</Text>
      <Pressable testID="one-native-gpu-placeholder" />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 10, backgroundColor: '#F5F5F7' },
  text: { color: '#17233A', fontSize: 12 },
})
