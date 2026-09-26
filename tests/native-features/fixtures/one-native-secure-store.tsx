import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

// round-trips One.SecureStore through its async and sync verbs and prints one
// label per behavior. the persist key is written by a run and read on mount,
// so a relaunch proves the value survives the process. readings travel as
// labels because RN Text testIDs vanish from the accessibility snapshot.
const persistKey = 'one-native-secure-store-persist'

function errorName(error: unknown) {
  return error instanceof Error ? error.name : String(error)
}

async function runAll(report: (name: string, value: string) => void) {
  const { SecureStore } = One
  await SecureStore.deleteItem('async')
  report('AsyncMissing', String(await SecureStore.getItem('async')))
  await SecureStore.setItem('async', 'a1')
  await SecureStore.setItem('async', 'a2')
  report('Async', String(await SecureStore.getItem('async')))
  await SecureStore.deleteItem('async')
  report('AsyncDeleted', String(await SecureStore.getItem('async')))

  SecureStore.deleteItemSync('sync')
  report('SyncMissing', String(SecureStore.getItemSync('sync')))
  SecureStore.setItemSync('sync', 's1')
  SecureStore.setItemSync('sync', 's2')
  report('Sync', String(SecureStore.getItemSync('sync')))
  report('SyncToAsync', String(await SecureStore.getItem('sync')))
  await SecureStore.setItem('sync', 'from async')
  report('AsyncToSync', String(SecureStore.getItemSync('sync')))
  SecureStore.deleteItemSync('sync')
  report('SyncDeleted', String(await SecureStore.getItem('sync')))

  try {
    SecureStore.setItemSync('', 'x')
    report('EmptyKey', 'accepted')
  } catch (error) {
    report('EmptyKey', errorName(error))
  }

  SecureStore.setItemSync(persistKey, 'kept')
}

export default function OneNativeSecureStore() {
  const [persisted] = useState(() => String(One.SecureStore.getItemSync(persistKey)))
  const [results, setResults] = useState<[string, string][]>([])
  const [status, setStatus] = useState('idle')

  return (
    <View style={styles.screen}>
      <Text>{`Status: ${status}`}</Text>
      <Text>{`Persisted: ${persisted}`}</Text>
      {results.map(([name, value]) => (
        <Text key={name}>{`${name}: ${value}`}</Text>
      ))}
      <Pressable
        testID="one-native-secure-store-run"
        style={styles.chip}
        onPress={() => {
          setResults([])
          setStatus('running')
          runAll((name, value) => setResults((current) => [...current, [name, value]])).then(
            () => setStatus('done'),
            (error: unknown) => setStatus(`failed ${errorName(error)} ${String(error)}`)
          )
        }}
      >
        <Text>Run secure store checks</Text>
      </Pressable>
      <Pressable
        testID="one-native-secure-store-clear"
        style={styles.chip}
        onPress={() => {
          One.SecureStore.deleteItemSync(persistKey)
          setStatus('cleared')
        }}
      >
        <Text>Clear persisted</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 6 },
  chip: { padding: 10, borderRadius: 8, backgroundColor: '#e5e7eb', alignSelf: 'flex-start' },
})
