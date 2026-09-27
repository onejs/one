import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

const code = (error: unknown) =>
  error && typeof error === 'object' && 'code' in error ? String(error.code) : String(error)

export default function OneNativeProtectedStore() {
  const [key] = useState(() => `one-protected-proof-${Date.now()}`)
  const [status, setStatus] = useState('idle')
  const [result, setResult] = useState('none')
  const userKey = `${key}-presence`
  const store = One.iOS.ProtectedStore

  const fail = (step: string, error: unknown) => {
    setResult(`${step}: ${code(error)}`)
    setStatus('failed')
  }

  const prepare = async () => {
    setStatus('preparing')
    try {
      const missing = await store.getItem(key, 'Check for a saved proof item', 'biometryCurrentSet')
      const invalid = await store.getItem(key, ' ', 'biometryCurrentSet').then(() => 'unexpected', code)
      await store.createItem(key, 'v1', 'biometryCurrentSet')
      const duplicate = await store.createItem(key, 'duplicate', 'biometryCurrentSet').then(
        () => 'unexpected', code
      )
      await store.createItem(userKey, 'vp', 'userPresence')
      setResult(`missing=${missing}; invalid=${invalid}; duplicate=${duplicate}`)
      setStatus('prepared')
    } catch (error) {
      fail('prepare', error)
    }
  }

  const readBiometry = async () => {
    setStatus('reading-biometry')
    try {
      const value = await store.getItem(key, 'Read the protected proof item', 'biometryCurrentSet')
      setResult((previous) => `${previous}; biometric=${value}`)
      setStatus('biometry-read')
    } catch (error) {
      fail('read-biometry', error)
    }
  }

  const readPresence = async () => {
    setStatus('reading-presence')
    try {
      const value = await store.getItem(userKey, 'Read the user-presence proof item', 'userPresence')
      setResult((previous) => `${previous}; presence=${value}`)
      setStatus('presence-read')
    } catch (error) {
      fail('read-presence', error)
    }
  }

  const update = async () => {
    setStatus('updating')
    try {
      await store.updateItem(key, 'v2', 'Update the protected proof item', 'biometryCurrentSet')
      setStatus('updated')
    } catch (error) {
      fail('update', error)
    }
  }

  const readUpdated = async () => {
    setStatus('reading-updated')
    try {
      const value = await store.getItem(key, 'Read the updated proof item', 'biometryCurrentSet')
      setResult((previous) => `${previous}; updated=${value}`)
      setStatus('updated-read')
    } catch (error) {
      fail('read-updated', error)
    }
  }

  const deleteBiometry = async () => {
    setStatus('deleting-biometry')
    try {
      await store.deleteItem(key, 'Remove the protected proof item', 'biometryCurrentSet')
      setStatus('biometry-deleted')
    } catch (error) {
      fail('delete-biometry', error)
    }
  }

  const cleanup = async () => {
    setStatus('cleaning')
    try {
      await store.deleteItem(userKey, 'Remove the user-presence proof item', 'userPresence')
      const absent = await store.getItem(key, 'Check the removed proof item', 'biometryCurrentSet')
      const missingUpdate = await store.updateItem(key, 'v3', 'Update the removed proof item', 'biometryCurrentSet').then(
        () => 'unexpected', code
      )
      setResult((previous) => `${previous}; absent=${absent}; missingUpdate=${missingUpdate}`)
      setStatus('passed')
    } catch (error) {
      fail('cleanup', error)
    }
  }

  return (
    <View style={styles.screen}>
      <Text>{`Status: ${status}`}</Text>
      <Text>{`Result: ${result}`}</Text>
      <Pressable testID="protected-store-prepare" style={styles.button} onPress={prepare}>
        <Text>Prepare protected items</Text>
      </Pressable>
      <Pressable testID="protected-store-read-biometry" style={styles.button} onPress={readBiometry}>
        <Text>Read biometric item</Text>
      </Pressable>
      <Pressable testID="protected-store-read-presence" style={styles.button} onPress={readPresence}>
        <Text>Read presence item</Text>
      </Pressable>
      <Pressable testID="protected-store-update" style={styles.button} onPress={update}>
        <Text>Update biometric item</Text>
      </Pressable>
      <Pressable testID="protected-store-read-updated" style={styles.button} onPress={readUpdated}>
        <Text>Read updated item</Text>
      </Pressable>
      <Pressable testID="protected-store-delete-biometry" style={styles.button} onPress={deleteBiometry}>
        <Text>Remove biometric item</Text>
      </Pressable>
      <Pressable testID="protected-store-cleanup" style={styles.button} onPress={cleanup}>
        <Text>Remove presence item</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 8 },
  button: { padding: 12, backgroundColor: '#eee', borderRadius: 8 },
})
