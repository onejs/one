import { useState } from 'react'
import { Text, TextInput, View } from 'react-native'

function Field({ limit, multiline }: { limit: number; multiline: boolean }) {
  const [value, setValue] = useState('')
  const [changes, setChanges] = useState(0)
  return <View style={{ width: 260, gap: 12 }}>
    <Text style={{ fontSize: 20, color: '#162331' }}>{`${multiline ? 'multi' : 'single'} ${limit}`}</Text>
    <TextInput maxLength={limit} multiline={multiline} value={value}
      onChangeText={(text) => { setValue(text); setChanges((count) => count + 1) }}
      style={{ width: 240, height: 70, padding: 8, fontSize: 24, color: '#162331', backgroundColor: '#d9e8f6' }} />
    <Text style={{ fontSize: 18, color: '#162331' }}>{`units ${value.length}, changes ${changes}`}</Text>
  </View>
}

export default function MaxLength() {
  return <View style={{ flex: 1, padding: 32, gap: 24, backgroundColor: '#fff' }}>
    <Text style={{ fontSize: 26, color: '#162331' }}>AFTER: UTF-16 input limits</Text>
    {[false, true].map((multiline) => <View key={String(multiline)} style={{ flexDirection: 'row', gap: 32 }}>
      {[0, 1, 2].map((limit) => <Field key={limit} limit={limit} multiline={multiline} />)}
    </View>)}
  </View>
}
