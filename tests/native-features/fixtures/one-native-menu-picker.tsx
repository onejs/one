import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

export default function OneNativeMenuPicker() {
  const [selection, setSelection] = useState('small')
  const [requested, setRequested] = useState('none')
  const [pickerEvents, setPickerEvents] = useState(0)
  const [reject, setReject] = useState(false)
  const [revision, setRevision] = useState(0)
  const [otherAction, setOtherAction] = useState('none')
  const items = [
    {
      type: 'picker' as const, id: 'size', title: 'Size', selection,
      children: [
        { type: 'action' as const, id: 'small', title: 'Small' },
        { type: 'action' as const, id: 'large', title: 'Large' },
        { type: 'action' as const, id: 'automatic', title: 'Automatic' },
      ],
    },
    { type: 'action' as const, id: 'other', title: 'Other action' },
  ]
  const onPickerChange = (id: string, value: string) => {
    if (id !== 'size') throw new Error(`Unexpected picker: ${id}`)
    setRequested(value)
    setPickerEvents((count) => count + 1)
    if (!reject) setSelection(value)
  }

  return (
    <View style={styles.screen} testID="one-native-menu-picker-screen">
      <Text>{`Selected: ${selection}`}</Text>
      <Text>{`Requested: ${requested}`}</Text>
      <Text>{`Picker events: ${pickerEvents}`}</Text>
      <Text>{`Reject: ${reject ? 'on' : 'off'}`}</Text>
      <Text>{`Other action: ${otherAction}`}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Toggle rejection" onPress={() => setReject((value) => !value)}>
        <Text>Toggle rejection</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Reset picker" onPress={() => { setSelection('small'); setRequested('none'); setRevision((value) => value + 1) }}>
        <Text>Reset picker</Text>
      </Pressable>
      <One.iOS.Menu
        accessibilityLabel="Menu with picker"
        testID="one-native-menu-picker-menu"
        revision={revision}
        items={items}
        onAction={setOtherAction}
        onPickerChange={onPickerChange}
      >
        <View style={styles.trigger}><Text>Choose size</Text></View>
      </One.iOS.Menu>
      <One.iOS.ContextMenu
        accessibilityLabel="Context menu with picker"
        testID="one-native-menu-picker-context"
        revision={revision}
        items={items}
        onAction={setOtherAction}
        onPickerChange={onPickerChange}
      >
        <View style={styles.trigger}><Text>Hold for size</Text></View>
      </One.iOS.ContextMenu>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 90, paddingHorizontal: 20, gap: 16, backgroundColor: '#FFFFFF' },
  trigger: { width: 220, height: 54, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 8, backgroundColor: '#E3E3E8' },
})
