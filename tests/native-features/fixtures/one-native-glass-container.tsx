import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

export default function OneNativeGlassContainer() {
  const [spacing, setSpacing] = useState(0)
  const [taps, setTaps] = useState(0)
  const [height, setHeight] = useState(0)

  return (
    <View style={styles.screen} testID="one-native-glass-container-screen">
      <Text style={styles.status}>{`Spacing: ${spacing}`}</Text>
      <Text style={styles.status}>{`Glass taps: ${taps}`}</Text>
      <Text style={styles.status}>{`Measured: ${height}`}</Text>
      <Pressable
        accessibilityRole="button"
        style={styles.action}
        testID="one-native-glass-container-spacing"
        onPress={() => setSpacing((value) => (value === 0 ? 60 : 0))}
      >
        <Text style={styles.actionText}>Change merge spacing</Text>
      </Pressable>
      <View style={styles.stage}>
        <View pointerEvents="none" style={[styles.band, styles.bandBlue]} />
        <View pointerEvents="none" style={[styles.band, styles.bandPink]} />
        <One.iOS.GlassEffectContainer
          spacing={spacing}
          testID="one-native-glass-container-native"
          onLayout={({ nativeEvent }) => setHeight(Math.round(nativeEvent.layout.height))}
        >
          <One.iOS.HStack spacing={10}>
            <One.iOS.Button
              label="First glass"
              onPress={() => setTaps((value) => value + 1)}
              swiftStyle={{ glassEffect: 'regular', glassEffectShape: 'capsule', padding: 14 }}
            />
            <One.iOS.Button
              label="Second glass"
              onPress={() => setTaps((value) => value + 1)}
              swiftStyle={{ glassEffect: 'regular', glassEffectShape: 'capsule', padding: 14 }}
            />
          </One.iOS.HStack>
        </One.iOS.GlassEffectContainer>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16, paddingTop: 70, gap: 8, backgroundColor: '#FFFFFF' },
  status: { color: '#17233A', fontSize: 14 },
  action: { alignSelf: 'flex-start', padding: 10, borderRadius: 8, backgroundColor: '#E3E3E8' },
  actionText: { color: '#17233A', fontSize: 14, fontWeight: '600' },
  stage: { minHeight: 180, paddingTop: 50, overflow: 'hidden', backgroundColor: '#122958' },
  band: { position: 'absolute', top: 0, bottom: 0, width: 95 },
  bandBlue: { left: 60, backgroundColor: '#126BD7' },
  bandPink: { left: 210, backgroundColor: '#EF83AE' },
})
