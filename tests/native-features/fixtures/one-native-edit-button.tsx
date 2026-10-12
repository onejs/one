import { StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

export default function OneNativeEditButton() {
  return (
    <View style={styles.screen} testID="one-native-edit-button-screen">
      <Text>Native list edit mode</Text>
      <One.iOS.List style={styles.list} listStyle="plain">
        <One.iOS.Section title="Items">
          <One.iOS.EditButton testID="one-native-edit-button-control" />
          <One.iOS.Text text="Alpha" />
          <One.iOS.Text text="Beta" />
        </One.iOS.Section>
      </One.iOS.List>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 70, backgroundColor: '#F5F5F7' },
  list: { flex: 1 },
})
