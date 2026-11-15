import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { One } from 'one'

// standalone buttons dropped straight into a react native tree, each its own
// hosting view, plus one under a gesture handler root the way most apps mount
// their screens. a tap reports through onPress, so the counter names the button
// that fired and how many presses arrived.
export default function OneNativeButton() {
  const [state, setState] = useState({ name: 'idle', count: 0 })
  const press = (name: string) => setState((previous) => ({ name, count: previous.count + 1 }))
  return (
    <View style={styles.screen} testID="one-native-button-screen">
      <One.iOS.Button testID="one-native-button-automatic" label="Automatic" onPress={() => press('automatic')} />
      <One.iOS.Button
        testID="one-native-button-bordered"
        label="Bordered"
        swiftStyle={{ buttonStyle: 'bordered' }}
        onPress={() => press('bordered')}
      />
      <GestureHandlerRootView style={styles.gestureRoot}>
        <One.iOS.Button
          testID="one-native-button-gesture-root"
          label="Under gesture root"
          onPress={() => press('gesture-root')}
        />
      </GestureHandlerRootView>
      <One.iOS.Button
        testID="one-native-button-icon-only"
        systemImage="star"
        onPress={() => press('icon-only')}
      />
      <One.iOS.Button
        testID="one-native-button-label-image"
        label="Add"
        systemImage="plus"
        onPress={() => press('label-image')}
      />
      <One.iOS.Button testID="one-native-button-children" onPress={() => press('children')}>
        <One.iOS.Text text="Custom label" />
      </One.iOS.Button>
      <One.iOS.Button
        testID="one-native-button-destructive"
        label="Delete"
        buttonRole="destructive"
        onPress={() => press('destructive')}
      />
      <One.iOS.Button
        testID="one-native-button-cancel"
        label="Cancel"
        buttonRole="cancel"
        onPress={() => press('cancel')}
      />
      <Text testID="one-native-button-state">{`button:${state.name} count:${state.count}`}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  gestureRoot: { flexGrow: 0 },
  screen: { flex: 1, gap: 12, paddingHorizontal: 22, paddingTop: 70, backgroundColor: '#fff' },
})
