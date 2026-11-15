import { useState } from 'react'
import { Text, TextInput, View } from 'react-native'
import { One } from 'one'

function Column({ mode }: { mode: 'auto' | 'none' | 'box-only' | 'box-none' }) {
  const [isOn, setIsOn] = useState(false)
  const [presses, setPresses] = useState(0)
  const [focuses, setFocuses] = useState(0)
  const [text, setText] = useState('')
  const [touches, setTouches] = useState(0)
  return <View style={{ width: 260, gap: 16 }}>
    <Text style={{ fontSize: 22, color: '#162331' }}>{mode}</Text>
    <View pointerEvents={mode} onTouchStart={() => setTouches((value) => value + 1)}
      style={{ padding: 16, gap: 24, backgroundColor: '#d9e8f6' }}>
      <One.linux.Switch isOn={isOn} onIsOnChange={(event) => setIsOn(event.isOn)} />
      <One.linux.Button title="Click" onPress={() => setPresses((value) => value + 1)} />
      <TextInput value={text} onChangeText={setText} onFocus={() => setFocuses((value) => value + 1)}
        placeholder="click, then type" style={{ width: 220, height: 40, fontSize: 18, backgroundColor: '#fff', color: '#162331' }} />
    </View>
    <Text style={{ fontSize: 20, color: '#162331' }}>{`switch ${isOn}\npresses ${presses}\nfocuses ${focuses}\ntyped ${text}\nRN touches ${touches}`}</Text>
  </View>
}

export default function Picking() {
  return <View style={{ flex: 1, padding: 32, backgroundColor: '#fff', gap: 24 }}>
    <Text style={{ fontSize: 26, color: '#162331' }}>AFTER: GTK pointerEvents</Text>
    <View style={{ flexDirection: 'row', gap: 32 }}>
      {(['none', 'box-only', 'auto', 'box-none'] as const).map((mode) => <Column key={mode} mode={mode} />)}
    </View>
  </View>
}
