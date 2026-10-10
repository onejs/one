import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

export default function OneNativeSwipeActionsFixture() {
  const [pinTaps, setPinTaps] = useState(0)
  const [archiveTaps, setArchiveTaps] = useState(0)

  return (
    <View style={styles.screen} testID="one-native-swipe-actions-screen">
      <Text>{`Pin taps: ${pinTaps}`}</Text>
      <Text>{`Archive taps: ${archiveTaps}`}</Text>
      <One.iOS.List style={styles.list} testID="one-native-swipe-actions-list">
        <One.iOS.Section>
          <One.iOS.SwipeActions testID="one-native-swipe-actions-row">
            <One.iOS.Text text="Swipe target" />
            <One.iOS.SwipeActions.Actions edge="leading" allowsFullSwipe={false}>
              <One.iOS.Button label="Pin" systemImage="pin" onPress={() => setPinTaps((value) => value + 1)} />
            </One.iOS.SwipeActions.Actions>
            <One.iOS.SwipeActions.Actions edge="trailing">
              <One.iOS.Button label="Archive" systemImage="archivebox" onPress={() => setArchiveTaps((value) => value + 1)} />
            </One.iOS.SwipeActions.Actions>
          </One.iOS.SwipeActions>
        </One.iOS.Section>
      </One.iOS.List>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 90, paddingHorizontal: 20, gap: 12, backgroundColor: '#FFFFFF' },
  list: { height: 220 },
})
