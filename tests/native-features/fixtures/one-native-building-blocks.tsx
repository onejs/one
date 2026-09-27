import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

export default function OneNativeBuildingBlocks() {
  const [account, setAccount] = useState('Ready')
  const [badgeTaps, setBadgeTaps] = useState(0)
  const [glassTaps, setGlassTaps] = useState(0)
  const [glassEffect, setGlassEffect] = useState<'regular' | 'identity'>('regular')
  const [rowWidth, setRowWidth] = useState(300)

  return (
    <View style={styles.screen} testID="one-native-building-blocks-screen">
      <Text>{`Account state: ${account}`}</Text>
      <Text>{`Badge taps: ${badgeTaps}`}</Text>
      <Text>{`Glass taps: ${glassTaps}`}</Text>
      <Text>{`Glass effect: ${glassEffect}`}</Text>
      <Text>{`Row width: ${rowWidth}`}</Text>
      <Pressable testID="one-native-building-blocks-account" onPress={() => setAccount((value) => value === 'Ready' ? 'Updated' : 'Ready')}>
        <Text>Update account</Text>
      </Pressable>
      <Pressable testID="one-native-building-blocks-glass-toggle" onPress={() => setGlassEffect((value) => value === 'regular' ? 'identity' : 'regular')}>
        <Text>Toggle glass</Text>
      </Pressable>
      <Pressable testID="one-native-building-blocks-row-width" onPress={() => setRowWidth((value) => value === 300 ? 240 : 300)}>
        <Text>Change row width</Text>
      </Pressable>

      <One.iOS.ZStack alignment="bottomTrailing" style={{ width: 220 }} testID="one-native-building-blocks-zstack">
        <One.iOS.Rectangle fill="#B1DAFD" swiftStyle={{ frameWithWidthAndHeightAndAlignment: { width: 220, height: 80, alignment: 'center' } }} />
        <One.iOS.Button label="Badge action" onPress={() => setBadgeTaps((value) => value + 1)} />
      </One.iOS.ZStack>

      <One.iOS.HStack spacing={0} style={{ width: rowWidth }} testID="one-native-building-blocks-hstack">
        <One.iOS.Text text="Left edge" />
        <One.iOS.Spacer minLength={30} testID="one-native-building-blocks-spacer" />
        <One.iOS.Text text="Right edge" />
      </One.iOS.HStack>

      <One.iOS.LabeledContent label="Account" value={account} testID="one-native-building-blocks-labeled" />

      <View style={styles.glassBackdrop}>
        <View style={styles.glassBackdropLight} />
        <View style={styles.glassBackdropDark} />
        <One.iOS.Glass glassEffect={glassEffect} style={{ width: 220, height: 80 }} testID="one-native-building-blocks-glass">
          <One.iOS.Button label="Glass action" onPress={() => setGlassTaps((value) => value + 1)} />
        </One.iOS.Glass>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16, paddingTop: 90, gap: 12, backgroundColor: '#DCE8F5' },
  glassBackdrop: { width: 220, height: 80 },
  glassBackdropLight: { position: 'absolute', left: 0, top: 0, width: 110, height: 80, backgroundColor: '#E8C77E' },
  glassBackdropDark: { position: 'absolute', left: 110, top: 0, width: 110, height: 80, backgroundColor: '#4C78A8' },
})
