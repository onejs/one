import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

export default function OneNativeMultiDatePickerFixture() {
  const [monthPrefix] = useState(() => {
    const today = new Date()
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-`
  })
  const [selection, setSelection] = useState<string[]>([`${monthPrefix}10`])
  const [requested, setRequested] = useState('none')
  const [reject, setReject] = useState(false)
  const [disabled, setDisabled] = useState(false)
  const [revision, setRevision] = useState(0)

  return (
    <View style={styles.screen} testID="one-native-multi-date-screen">
      <Text>{`Selected days: ${selection.join(',') || 'none'}`}</Text>
      <Text>{`Requested days: ${requested}`}</Text>
      <Text>{`Reject: ${reject}`}</Text>
      <Text>{`Disabled: ${disabled}`}</Text>
      <Text>{`Revision: ${revision}`}</Text>
      <Pressable testID="one-native-multi-date-external" onPress={() => setSelection([`${monthPrefix}12`])}>
        <Text>External day</Text>
      </Pressable>
      <Pressable testID="one-native-multi-date-reject" onPress={() => setReject((value) => !value)}>
        <Text>Toggle rejection</Text>
      </Pressable>
      <Pressable testID="one-native-multi-date-disabled" onPress={() => setDisabled((value) => !value)}>
        <Text>Toggle disabled</Text>
      </Pressable>
      <Pressable testID="one-native-multi-date-reset" onPress={() => { setSelection([]); setRevision((value) => value + 1) }}>
        <Text>Reset days</Text>
      </Pressable>
      <One.iOS.MultiDatePicker
        label="Choose days"
        selection={selection}
        onSelectionChange={(days) => {
          setRequested(days.join(','))
          if (!reject) setSelection([...days])
        }}
        revision={revision}
        disabled={disabled}
        testID="one-native-multi-date-control"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 70, paddingHorizontal: 16, backgroundColor: '#FFFFFF' },
})
