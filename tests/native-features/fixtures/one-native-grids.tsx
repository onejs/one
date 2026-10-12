import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

export default function OneNativeGrids() {
  const [reversed, setReversed] = useState(false)
  const [overlap, setOverlap] = useState(false)
  const [taps, setTaps] = useState(0)
  const vertical = reversed ? ['V3', 'V2', 'V1', 'V0'] : ['V0', 'V1', 'V2', 'V3']
  return (
    <View style={styles.screen} testID="one-native-grids-screen">
      <Text testID="one-native-grid-order">Order: {reversed ? 'reverse' : 'forward'}</Text>
      <Text testID="one-native-grid-spacing-status">Spacing: {overlap ? 'overlap' : 'regular'}</Text>
      <Text testID="one-native-grid-taps">Taps: {taps}</Text>
      <Pressable testID="one-native-grid-reverse" onPress={() => setReversed((value) => !value)}>
        <Text>Reverse grid</Text>
      </Pressable>
      <Pressable testID="one-native-grid-spacing" onPress={() => setOverlap((value) => !value)}>
        <Text>Overlap rows</Text>
      </Pressable>

      <One.iOS.ScrollView style={styles.vertical}>
        <One.iOS.LazyVGrid
          columns={[{ size: 'fixed', value: 80 }, { size: 'flexible', minimum: 80 }]}
          spacing={overlap ? -8 : 12}
        >
          {vertical.map((value) => <One.iOS.Text key={value} text={value} />)}
        </One.iOS.LazyVGrid>
      </One.iOS.ScrollView>

      <One.iOS.ScrollView axes="horizontal" style={styles.horizontal}>
        <One.iOS.LazyHGrid
          rows={[{ size: 'fixed', value: 30 }, { size: 'fixed', value: 30 }]}
          spacing={16}
        >
          {['H0', 'H1', 'H2', 'H3'].map((value) => <One.iOS.Text key={value} text={value} />)}
        </One.iOS.LazyHGrid>
      </One.iOS.ScrollView>

      <One.iOS.Grid horizontalSpacing={24} verticalSpacing={10} style={styles.grid}>
        <One.iOS.GridRow>
          <One.iOS.Button label="Tap grid" onPress={() => setTaps((value) => value + 1)} />
          <One.iOS.Text text="G1" />
        </One.iOS.GridRow>
        <One.iOS.GridRow alignment="bottom">
          <One.iOS.Text text="G2" />
          <One.iOS.Text text="G3" />
        </One.iOS.GridRow>
        <One.iOS.Text text="Grid footer" />
      </One.iOS.Grid>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16, paddingTop: 90, gap: 12, backgroundColor: '#fff' },
  vertical: { height: 100 },
  horizontal: { height: 90 },
  grid: { height: 130 },
})
