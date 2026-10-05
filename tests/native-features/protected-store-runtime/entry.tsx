import React, { useEffect, useState } from 'react'
import { AppRegistry, Text, View } from 'react-native'
import { ProtectedStore } from '../../../packages/one/src/platform/protected-store/index.native'

type Command = { id: string; operation: 'createItem' | 'getItem' | 'updateItem' | 'deleteItem'; key: string; value?: string; reason?: string; policy: 'userPresence' | 'biometryCurrentSet' }
function Probe() {
  const [status, setStatus] = useState('connecting')
  useEffect(() => {
    const socket = new WebSocket('ws://localhost:8132')
    socket.onopen = () => { setStatus('ready'); socket.send(JSON.stringify({ event: 'ready' })) }
    socket.onmessage = async ({ data }) => {
      const command: Command = JSON.parse(String(data))
      setStatus(`${command.id}: ${command.operation}`)
      const started = Date.now()
      try {
        const { operation, key, policy } = command
        let value: string | null | undefined
        if (operation === 'createItem') await ProtectedStore.createItem(key, command.value!, policy)
        else if (operation === 'getItem') value = await ProtectedStore.getItem(key, command.reason!, policy)
        else if (operation === 'updateItem') await ProtectedStore.updateItem(key, command.value!, command.reason!, policy)
        else await ProtectedStore.deleteItem(key, command.reason!, policy)
        socket.send(JSON.stringify({ event: 'result', id: command.id, outcome: 'resolved', value, elapsedMs: Date.now() - started }))
        setStatus(`${command.id}: resolved`)
      } catch (error) {
        socket.send(JSON.stringify({ event: 'result', id: command.id, outcome: 'rejected', code: (error as any)?.code, message: String(error), elapsedMs: Date.now() - started }))
        setStatus(`${command.id}: ${(error as any)?.code}`)
      }
    }
    return () => socket.close()
  }, [])
  return <View style={{ padding: 24 }}><Text>ProtectedStore native proof</Text><Text testID="protected-runtime-status">{status}</Text></View>
}
AppRegistry.registerComponent('NativeFeatureTests', () => Probe)
