import { One } from 'one'
import { StyleSheet, Text, View } from 'react-native'

export default function OneNativeAndroidColor() {
  const materialPrimary = One.Android.Color.material.primary
  const dynamicPrimary = One.Android.Color.dynamic.primary
  const missingMaterial = One.Android.Color.material.notAColor

  return (
    <View style={styles.screen} testID="one-native-android-color-screen">
      <Text>{`Material primary: ${String(materialPrimary)}`}</Text>
      <Text>{`Dynamic primary: ${String(dynamicPrimary)}`}</Text>
      <Text>{`Unknown material: ${String(missingMaterial)}`}</Text>
      <View testID="one-native-android-color-platform-black" style={[styles.swatch, { backgroundColor: One.Android.Color.black }]} />
      <View testID="one-native-android-color-material-primary" style={[styles.swatch, { backgroundColor: materialPrimary }]} />
      <View testID="one-native-android-color-dynamic-primary" style={[styles.swatch, { backgroundColor: dynamicPrimary }]} />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 10 },
  swatch: { width: 220, height: 44 },
})
