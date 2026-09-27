import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

export default function OneNativeDisclosureGroupFixture() {
  const [expanded, setExpanded] = useState(false)
  const [nestedExpanded, setNestedExpanded] = useState(false)
  const [revision, setRevision] = useState(0)

  return (
    <View style={styles.screen} testID="one-native-disclosure-screen">
      <Text>{`Expanded: ${expanded}`}</Text>
      <One.iOS.DisclosureGroup
        label="Details"
        isExpanded={expanded}
        onIsExpandedChange={setExpanded}
        revision={revision}
        style={styles.group}
        testID="one-native-disclosure-native"
      >
        <One.iOS.Text text="Hidden detail" />
      </One.iOS.DisclosureGroup>
      <Text testID="one-native-disclosure-after">After disclosure</Text>
      <Text>{`Nested expanded: ${nestedExpanded}`}</Text>
      <One.iOS.Host style={styles.group} testID="one-native-disclosure-host">
        <One.iOS.DisclosureGroup
          label="Nested details"
          isExpanded={nestedExpanded}
          onIsExpandedChange={setNestedExpanded}
        >
          <One.iOS.Text text="Nested detail" />
        </One.iOS.DisclosureGroup>
      </One.iOS.Host>
      <Text testID="one-native-disclosure-after-nested">After nested</Text>
      <Pressable
        testID="one-native-disclosure-external"
        onPress={() => {
          setRevision((value) => value + 1)
          setExpanded((value) => !value)
        }}
      >
        <Text>Toggle externally</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 90, paddingHorizontal: 20, gap: 12, backgroundColor: '#FFFFFF' },
  group: { width: 260 },
})
