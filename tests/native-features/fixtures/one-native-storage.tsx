import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

const persistKey = 'one-native-storage-persist'

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function runChecks(report: (name: string, value: string) => void) {
  const storage = One.Storage
  for (const key of storage.getAllKeys()) storage.removeItem(key)
  report('Missing', String(storage.getItem('value')))
  storage.setItem('value', 'first')
  storage.setItem('value', 'second')
  report('Overwritten', String(storage.getItem('value')))
  storage.setItem('value', '')
  report('EmptyValue', JSON.stringify(storage.getItem('value')))
  storage.setItem('other', 'x')
  report('AllKeys', storage.getAllKeys().sort().join(','))
  storage.removeItem('value')
  report('AfterRemove', String(storage.getItem('value')))
  storage.removeItem('value')
  report('RemoveMissing', String(storage.getItem('value')))
  storage.removeItem('other')
  report('AllKeysEmpty', JSON.stringify(storage.getAllKeys()))

  try {
    storage.getItem('')
    report('EmptyKey', 'accepted')
  } catch (error) {
    report('EmptyKey', message(error))
  }
  try {
    Reflect.apply(storage.getItem, undefined, [123])
    report('NonStringKey', 'accepted')
  } catch (error) {
    report('NonStringKey', message(error))
  }
  try {
    Reflect.apply(storage.setItem, undefined, ['value', 123])
    report('NonStringValue', 'accepted')
  } catch (error) {
    report('NonStringValue', message(error))
  }
  storage.setItem(persistKey, 'kept')
}

// timings for comparing stores: microseconds per call over a fixed workload.
function runBench(report: (name: string, value: string) => void) {
  const storage = One.Storage
  const count = 10000
  const value = 'v'.repeat(64)
  const perCall = (start: number) => `${(((performance.now() - start) * 1000) / count).toFixed(2)}us`
  let start = performance.now()
  for (let index = 0; index < count; index++) storage.setItem(`bench-${index}`, value)
  report('BenchSet', perCall(start))
  start = performance.now()
  for (let index = 0; index < count; index++) storage.getItem(`bench-${index}`)
  report('BenchGet', perCall(start))
  start = performance.now()
  for (let index = 0; index < count; index++) storage.setItem('bench-hot', `${value}${index}`)
  report('BenchOverwrite', perCall(start))
  start = performance.now()
  const keys = storage.getAllKeys()
  report('BenchAllKeys', `${((performance.now() - start) * 1000).toFixed(0)}us for ${keys.length}`)
  start = performance.now()
  for (let index = 0; index < count; index++) storage.removeItem(`bench-${index}`)
  report('BenchRemove', perCall(start))
  storage.removeItem('bench-hot')
}

export default function OneNativeStorage() {
  const [persisted] = useState(() => String(One.Storage.getItem(persistKey)))
  const [results, setResults] = useState<[string, string][]>([])
  const [status, setStatus] = useState('idle')

  return (
    <View style={styles.screen}>
      <Text>{`Status: ${status}`}</Text>
      <Text>{`Persisted: ${persisted}`}</Text>
      {results.map(([name, value]) => <Text key={name}>{`${name}: ${value}`}</Text>)}
      <Pressable testID="one-native-storage-run" style={styles.chip} onPress={() => {
        const next: [string, string][] = []
        try {
          runChecks((name, value) => next.push([name, value]))
          setStatus('done')
        } catch (error) {
          setStatus(`failed ${message(error)}`)
        }
        setResults(next)
      }}>
        <Text>Run storage checks</Text>
      </Pressable>
      <Pressable testID="one-native-storage-bench" style={styles.chip} onPress={() => {
        const next: [string, string][] = []
        try {
          runBench((name, value) => next.push([name, value]))
          setStatus('benched')
        } catch (error) {
          setStatus(`failed ${message(error)}`)
        }
        setResults(next)
      }}>
        <Text>Run storage benchmark</Text>
      </Pressable>
      <Pressable testID="one-native-storage-clear" style={styles.chip} onPress={() => {
        One.Storage.removeItem(persistKey)
        setStatus('cleared')
      }}>
        <Text>Clear persisted</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 6, backgroundColor: '#fff' },
  chip: { padding: 10, borderRadius: 8, backgroundColor: '#e5e7eb', alignSelf: 'flex-start' },
})
