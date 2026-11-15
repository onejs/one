import { useState } from 'react'
import { Image, Text, View } from 'react-native'
import { One } from 'one'

export default function ImageRace() {
  const [source, setSource] = useState('a')
  const [events, setEvents] = useState<string[]>([])
  const report = (value: string) => setEvents((last) => [...last, value])
  return <View style={{ flex: 1, padding: 32, gap: 24, backgroundColor: '#fff' }}>
    <Text style={{ fontSize: 26, color: '#162331' }}>AFTER: image request identity</Text>
    <One.linux.Button title="Mount B" onPress={() => setSource('b')} />
    <Text style={{ fontSize: 20, color: '#162331' }}>{`source ${source}`}</Text>
    <Image source={{ uri: `http://127.0.0.1:8123/${source}.png` }} style={{ width: 160, height: 160 }}
      onLoad={(event) => report(`load ${event.nativeEvent.source.width}x${event.nativeEvent.source.height}`)}
      onError={() => report('error')} onProgress={() => report('progress')} onLoadEnd={() => report('end')} />
    <Text style={{ fontSize: 20, color: '#162331' }}>{events.join('\n')}</Text>
  </View>
}
