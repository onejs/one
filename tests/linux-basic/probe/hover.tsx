import { useState } from 'react'
import { Text, View } from 'react-native'

export default function Hover() {
  const [events, setEvents] = useState<Record<string, number>>({})
  const count = (name: string) => () => setEvents((last) => ({ ...last, [name]: (last[name] || 0) + 1 }))
  return <View style={{ flex: 1, padding: 32, backgroundColor: '#fff', gap: 24 }}>
    <Text style={{ fontSize: 26, color: '#162331' }}>AFTER: nested hover</Text>
    <View onPointerEnter={count('parent enter')} onPointerLeave={count('parent leave')}
      style={{ width: 500, height: 260, padding: 40, backgroundColor: '#d9e8f6' }}>
      <View onPointerEnter={count('child enter')} onPointerLeave={count('child leave')}
        style={{ width: 160, height: 100, backgroundColor: '#2b6cb0' }}>
        <Text pointerEvents="none" style={{ color: '#fff', fontSize: 20 }}>child</Text>
      </View>
      <Text pointerEvents="none" style={{ color: '#162331', fontSize: 20 }}>parent</Text>
    </View>
    <Text style={{ color: '#162331', fontSize: 22 }}>{['parent enter', 'child enter', 'parent leave', 'child leave']
      .map((name) => `${name}: ${events[name] || 0}`).join('\n')}</Text>
  </View>
}
