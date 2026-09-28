import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

const persistKey = 'one-native-preferences-persist'

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

async function runChecks(report: (name: string, value: string) => void) {
  const preferences = One.iOS.Preferences
  await preferences.deleteItem('async')
  report('Missing', String(await preferences.getItem('async')))
  await preferences.setItem('async', 'first')
  await preferences.setItem('async', 'second')
  report('Overwritten', String(await preferences.getItem('async')))
  report('SyncRead', String(preferences.getItemSync('async')))
  preferences.setItemSync('async', '')
  report('EmptyValue', JSON.stringify(await preferences.getItem('async')))
  preferences.setItemSync('async', 'third')
  report('AfterSyncWrite', String(await preferences.getItem('async')))
  preferences.deleteItemSync('async')
  report('AfterDelete', String(preferences.getItemSync('async')))
  await preferences.deleteItem('async')
  report('DeleteMissing', String(await preferences.getItem('async')))

  try {
    preferences.getItemSync('')
    report('EmptyKey', 'accepted')
  } catch (error) {
    report('EmptyKey', message(error))
  }
  try {
    Reflect.apply(preferences.getItem, undefined, [123])
    report('NonStringKey', 'accepted')
  } catch (error) {
    report('NonStringKey', message(error))
  }
  try {
    Reflect.apply(preferences.setItem, undefined, ['async', 123])
    report('NonStringValue', 'accepted')
  } catch (error) {
    report('NonStringValue', message(error))
  }
  preferences.setItemSync(persistKey, 'kept')
}

export default function OneNativePreferences() {
  const [persisted] = useState(() => String(One.iOS.Preferences.getItemSync(persistKey)))
  const [results, setResults] = useState<[string, string][]>([])
  const [status, setStatus] = useState('idle')

  return (
    <View style={styles.screen}>
      <Text>{`Status: ${status}`}</Text>
      <Text>{`Persisted: ${persisted}`}</Text>
      {results.map(([name, value]) => <Text key={name}>{`${name}: ${value}`}</Text>)}
      <Pressable testID="one-native-preferences-run" style={styles.chip} onPress={() => {
        setResults([])
        setStatus('running')
        runChecks((name, value) => setResults((current) => [...current, [name, value]])).then(
          () => setStatus('done'),
          (error: unknown) => setStatus(`failed ${message(error)}`)
        )
      }}>
        <Text>Run preferences checks</Text>
      </Pressable>
      <Pressable testID="one-native-preferences-clear" style={styles.chip} onPress={() => {
        One.iOS.Preferences.deleteItemSync(persistKey)
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
