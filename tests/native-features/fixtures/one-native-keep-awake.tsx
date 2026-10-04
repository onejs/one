import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

async function runChecks(report: (name: string, value: string) => void) {
  const keepAwake = One.KeepAwake
  const initial = await keepAwake.isEnabled()
  report('Initial', String(initial))
  try {
    await keepAwake.setEnabled(true)
    report('Enabled', String(await keepAwake.isEnabled()))
    await keepAwake.setEnabled(false)
    report('Disabled', String(await keepAwake.isEnabled()))
    try {
      Reflect.apply(keepAwake.setEnabled, undefined, [1])
      report('Invalid', 'accepted')
    } catch (error) {
      report('Invalid', message(error))
    }
  } finally {
    await keepAwake.setEnabled(initial)
    report('Restored', String(await keepAwake.isEnabled()))
  }
}

export default function OneNativeKeepAwake() {
  const [results, setResults] = useState<[string, string][]>([])
  const [status, setStatus] = useState('idle')

  return (
    <View style={styles.screen}>
      <Text>{`Status: ${status}`}</Text>
      {results.map(([name, value]) => <Text key={name}>{`${name}: ${value}`}</Text>)}
      <Pressable testID="one-native-keep-awake-run" style={styles.chip} onPress={() => {
        setResults([])
        setStatus('running')
        runChecks((name, value) => setResults((current) => [...current, [name, value]])).then(
          () => setStatus('done'),
          (error: unknown) => setStatus(`failed ${message(error)}`)
        )
      }}>
        <Text>Run keep-awake checks</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 6, backgroundColor: '#fff' },
  chip: { padding: 10, borderRadius: 8, backgroundColor: '#e5e7eb', alignSelf: 'flex-start' },
})
