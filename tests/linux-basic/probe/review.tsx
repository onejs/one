import { useState } from 'react'
import { Text, View, Pressable } from 'react-native'
import ImageRace from './image-race'
import Sockets from './sockets'
import MaxLength from './max-length'
import Controlled from './controlled'
import Controls from './m3-controls'

const probes = { controls: Controls, images: ImageRace, sockets: Sockets, limits: MaxLength, controlled: Controlled }
export default function Review() {
  const [mode, setMode] = useState<keyof typeof probes>('controls')
  const Probe = probes[mode]
  return <View style={{ flex: 1 }}>
    <View style={{ flexDirection: 'row', backgroundColor: '#d9e8f6', height: 50 }}>
      {Object.keys(probes).map((name) => <Pressable key={name} onPress={() => setMode(name as keyof typeof probes)}
        style={{ width: 150, padding: 12 }}><Text style={{ fontSize: 18, color: '#162331' }}>{name}</Text></Pressable>)}
    </View>
    <Probe />
  </View>
}
