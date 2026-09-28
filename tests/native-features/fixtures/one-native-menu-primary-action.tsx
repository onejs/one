import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

export default function OneNativeMenuPrimaryAction() {
  const [presses, setPresses] = useState(0)
  const [itemAction, setItemAction] = useState('none')
  const [plainItem, setPlainItem] = useState('none')
  const [disabled, setDisabled] = useState(false)

  return (
    <View style={styles.screen} testID="one-native-menu-primary-screen">
      <Text>{`Primary presses: ${presses}`}</Text>
      <Text>{`Item action: ${itemAction}`}</Text>
      <Text>{`Plain item: ${plainItem}`}</Text>
      <Text>{`Disabled: ${disabled ? 'on' : 'off'}`}</Text>
      <Pressable
        accessibilityRole="button"
        testID="one-native-menu-primary-toggle"
        onPress={() => setDisabled((value) => !value)}
      >
        <Text>Toggle disabled</Text>
      </Pressable>
      <One.iOS.Menu
        accessibilityLabel="Open document or more"
        testID="one-native-menu-primary-menu"
        disabled={disabled}
        items={[{ type: 'action', id: 'alternate', title: 'Alternate action' }]}
        onAction={setItemAction}
        primaryAction={() => setPresses((count) => count + 1)}
      >
        <View style={styles.trigger} testID="one-native-menu-primary-trigger">
          <Text>Open document</Text>
        </View>
      </One.iOS.Menu>
      <One.iOS.Menu
        accessibilityLabel="Plain menu"
        testID="one-native-menu-plain-menu"
        items={[{ type: 'action', id: 'plain', title: 'Plain action' }]}
        onAction={setPlainItem}
      >
        <View style={styles.trigger}>
          <Text>Open plain menu</Text>
        </View>
      </One.iOS.Menu>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 90, paddingHorizontal: 20, gap: 16, backgroundColor: '#FFFFFF' },
  trigger: {
    width: 220,
    height: 54,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#E3E3E8',
  },
})
