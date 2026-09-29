import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

export default function OneNativeFormSectionModifiers() {
  const [expanded, setExpanded] = useState(false)

  return (
    <View style={styles.screen} testID="one-native-form-section-modifiers-screen">
      <Pressable
        testID="one-native-form-section-modifiers-toggle"
        onPress={() => setExpanded((value) => !value)}
      >
        <Text>{`Form sections: ${expanded ? 'expanded' : 'compact'}`}</Text>
      </Pressable>
      <One.iOS.Form
        style={styles.form}
        testID="one-native-form-section-modifiers-form"
        swiftStyle={{ listSectionSpacingWithCGFloat: expanded ? 100 : 10 }}
      >
        <One.iOS.Section
          title="First form section"
          swiftStyle={{
            headerProminence: expanded ? 'increased' : 'standard',
            listSectionMargins: { edges: 'leading', length: expanded ? 80 : 16 },
          }}
        >
          <One.iOS.Text text="Apple form row" />
        </One.iOS.Section>
        <One.iOS.Section title="Second form section">
          <One.iOS.Text text="Banana form row" />
        </One.iOS.Section>
      </One.iOS.Form>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 70, paddingHorizontal: 20, gap: 16, backgroundColor: '#FFFFFF' },
  form: { width: 340, height: 520 },
})
