import { useEffect, useState } from 'react'
import { Button, Platform, ScrollView, Text, TextInput, View } from 'react-native'
import { Device, Level } from '../features/native/device'

// native/Showcase holds the swift, native/Device.kt the kotlin. one prebuild
// compiles both into the app; the imports in features/native call them.
export default function NativeDemo() {
  const [info, setInfo] = useState<Record<string, string>>({})
  const [text, setText] = useState('hello from One')
  const [hash, setHash] = useState('')
  const [level, setLevel] = useState(0.4)

  useEffect(() => {
    Device.info().then(setInfo)
  }, [])

  useEffect(() => {
    // a digest that resolves after a newer edit belongs to old text
    let current = true
    Device.sha256(text).then((digest) => {
      if (current) setHash(digest)
    })
    return () => {
      current = false
    }
  }, [text])

  const step = (delta: number) =>
    setLevel((value) => Math.min(1, Math.max(0, value + delta)))

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: '#fff' }}
      contentContainerStyle={{ padding: 24, gap: 16 }}
    >
      <Text style={{ fontSize: 24, fontWeight: 'bold' }}>{info.language ?? '…'}</Text>
      <Text>
        {info.model} · {info.system}
      </Text>
      <TextInput
        value={text}
        onChangeText={setText}
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          borderRadius: 8,
          padding: 12,
          color: '#000',
        }}
      />
      <Text
        selectable
        style={{
          fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
          fontSize: 12,
        }}
      >
        sha256 {hash}
      </Text>
      <Level value={level} onChange={setLevel} />
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 24,
        }}
      >
        <Button title="−" onPress={() => step(-0.1)} />
        <Text>{Math.round(level * 100)}%</Text>
        <Button title="+" onPress={() => step(0.1)} />
      </View>
    </ScrollView>
  )
}
