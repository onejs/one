import { useState } from 'react'
import { Text, View } from 'react-native'
import { One } from 'one'

export default function Sockets() {
  const [closed, setClosed] = useState(0)
  const [failed, setFailed] = useState(0)
  const [running, setRunning] = useState(false)
  const run = () => {
    setRunning(true)
    const connect = (index: number) => {
      const socket = new WebSocket('ws://127.0.0.1:8123/socket')
      socket.onopen = () => socket.close(1000, 'done')
      socket.onerror = () => setFailed((value) => value + 1)
      socket.onclose = () => {
        setClosed(index)
        if (index < 20) connect(index + 1)
        else setRunning(false)
      }
    }
    connect(1)
  }
  return <View style={{ flex: 1, padding: 32, gap: 24, backgroundColor: '#fff' }}>
    <Text style={{ fontSize: 26, color: '#162331' }}>AFTER: WebSocket cleanup</Text>
    <One.linux.Button title="Open and close 20" disabled={running} onPress={run} style={{ width: 220 }} />
    <Text style={{ fontSize: 22, color: '#162331' }}>{`closed ${closed}, failed ${failed}`}</Text>
  </View>
}
