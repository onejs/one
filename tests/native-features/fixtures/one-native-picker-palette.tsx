import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

const options = [
  { value: 'alpha', label: 'Alpha' },
  { value: 'beta', label: 'Beta' },
  { value: 'gamma', label: 'Gamma' },
] as const

export default function OneNativePickerPalette() {
  const [palette, setPalette] = useState('alpha')
  const [segmented, setSegmented] = useState('alpha')

  return (
    <View style={styles.screen} testID="one-native-picker-palette-screen">
      <Text testID="one-native-picker-palette-value">{`Palette: ${palette}`}</Text>
      <Text testID="one-native-picker-segmented-value">{`Segmented: ${segmented}`}</Text>
      <Pressable testID="one-native-picker-palette-external" onPress={() => setPalette('gamma')}>
        <Text>Set palette to Gamma</Text>
      </Pressable>
      <Text>Palette outside Menu</Text>
      <One.iOS.Picker
        label="Palette choice"
        options={options}
        pickerStyle="palette"
        selection={palette}
        onSelectionChange={setPalette}
        style={styles.picker}
        testID="one-native-picker-palette"
      />
      <Text>Segmented reference</Text>
      <One.iOS.Picker
        label="Segmented choice"
        options={options}
        pickerStyle="segmented"
        selection={segmented}
        onSelectionChange={setSegmented}
        style={styles.picker}
        testID="one-native-picker-segmented"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 70, paddingHorizontal: 20, gap: 12, backgroundColor: '#FFFFFF' },
  picker: { width: '100%', height: 50 },
})
