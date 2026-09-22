import { Image, StyleSheet, Text, View } from 'react-native'

// TEMPORARY F1 probe: logs what Image.resolveAssetSource returns for a
// font asset. deleted once the four dev/release x ios/android values are
// captured. not part of the shipped fixture.
const fontId = require('../assets/OneNativeTestFont-Regular.ttf')
const resolved = Image.resolveAssetSource(fontId)

export default function FontProbe() {
  return (
    <View style={styles.screen}>
      <Text>{`probe-id: ${String(fontId)}`}</Text>
      <Text>{`probe-null: ${String(resolved === null)}`}</Text>
      <Text>{`probe-uri: ${resolved?.uri ?? 'null'}`}</Text>
      <Text>{`probe-scale: ${String(resolved?.scale)}`}</Text>
      <Text>{`probe-width: ${String(resolved?.width)}`}</Text>
      <Text>{`probe-height: ${String(resolved?.height)}`}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16 },
})
