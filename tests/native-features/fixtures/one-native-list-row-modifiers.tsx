import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

export default function OneNativeListRowModifiers() {
  const [custom, setCustom] = useState(false)

  return (
    <View style={styles.screen} testID="one-native-list-row-modifiers-screen">
      <Pressable testID="one-native-list-row-modifiers-toggle" onPress={() => setCustom((value) => !value)}>
        <Text>{`Row modifiers: ${custom ? 'custom' : 'default'}`}</Text>
      </Pressable>
      <One.iOS.List listStyle="plain" style={styles.list}>
        <One.iOS.Section title="Modifiers">
          <One.iOS.Text
            text="Inset row"
            swiftStyle={{
              listRowInsets: { edges: 'leading', length: custom ? 96 : 16 },
              listRowSeparator: { visibility: custom ? 'hidden' : 'visible', edges: 'bottom' },
              listRowSeparatorTint: { color: 'red', edges: 'bottom' },
            }}
          />
          <One.iOS.Text text="Control row" />
        </One.iOS.Section>
      </One.iOS.List>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 70, paddingHorizontal: 20, gap: 16, backgroundColor: '#FFFFFF' },
  list: { width: 340, height: 240 },
})
