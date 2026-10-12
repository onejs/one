import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

export default function OneNativeListSectionModifiers() {
  const [expanded, setExpanded] = useState(false)

  return (
    <View style={styles.screen} testID="one-native-list-section-modifiers-screen">
      <Pressable
        testID="one-native-list-section-modifiers-toggle"
        onPress={() => setExpanded((value) => !value)}
      >
        <Text>{`Section modifiers: ${expanded ? 'expanded' : 'compact'}`}</Text>
      </Pressable>
      <One.iOS.List
        listStyle="insetGrouped"
        style={styles.list}
        swiftStyle={{ listSectionSpacingWithCGFloat: expanded ? 100 : 10 }}
      >
        <One.iOS.Section
          title="First section"
          swiftStyle={{
            headerProminence: expanded ? 'increased' : 'standard',
            listSectionMargins: { edges: 'leading', length: expanded ? 80 : 16 },
          }}
        >
          <One.iOS.Text text="Apple row" />
        </One.iOS.Section>
        <One.iOS.Section title="Second section">
          <One.iOS.Text text="Banana row" />
        </One.iOS.Section>
      </One.iOS.List>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 70, paddingHorizontal: 20, gap: 16, backgroundColor: '#FFFFFF' },
  list: { width: 340, height: 520 },
})
