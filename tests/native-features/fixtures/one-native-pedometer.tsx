import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function coded(error: unknown): string {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code: unknown }).code)
      : 'nocode'
  return `${code}:${message(error)}`
}

async function runChecks(report: (name: string, value: string) => void) {
  const pedometer = One.Pedometer
  report('Available', String(pedometer.isAvailable()))
  const seen: number[] = []
  const subscription = pedometer.watchStepCount((result) => seen.push(result.steps))
  await new Promise((resolve) => setTimeout(resolve, 1500))
  subscription.remove()
  report('Watch', seen.length === 0 ? 'none' : seen.join(','))
  try {
    const history = await pedometer.getStepCount(
      new Date(Date.now() - 3_600_000),
      new Date()
    )
    report('History', String(history.steps))
  } catch (error) {
    report('History', coded(error))
  }
  const permissions = await pedometer.getPermissions()
  report(
    'Permissions',
    `${permissions.status}|${permissions.granted}|${permissions.canAskAgain}`
  )
  try {
    Reflect.apply(pedometer.watchStepCount, undefined, [1])
    report('Invalid', 'accepted')
  } catch (error) {
    report('Invalid', message(error))
  }
  try {
    Reflect.apply(pedometer.getStepCount, undefined, ['then', new Date()])
    report('InvalidRange', 'accepted')
  } catch (error) {
    report('InvalidRange', message(error))
  }
  try {
    Reflect.apply(pedometer.getStepCount, undefined, [new Date(2000), new Date(1000)])
    report('InvalidOrder', 'accepted')
  } catch (error) {
    report('InvalidOrder', message(error))
  }
}

export default function OneNativePedometer() {
  const [results, setResults] = useState<[string, string][]>([])
  const [status, setStatus] = useState('idle')

  return (
    <View style={styles.screen}>
      <Text>{`Status: ${status}`}</Text>
      {results.map(([name, value]) => (
        <Text key={name}>{`${name}: ${value}`}</Text>
      ))}
      <Pressable
        testID="one-native-pedometer-run"
        style={styles.chip}
        onPress={() => {
          setResults([])
          setStatus('running')
          runChecks((name, value) =>
            setResults((current) => [...current, [name, value]])
          ).then(
            () => setStatus('done'),
            (error: unknown) => setStatus(`failed ${message(error)}`)
          )
        }}
      >
        <Text>Run pedometer checks</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 6, backgroundColor: '#fff' },
  chip: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
    alignSelf: 'flex-start',
  },
})
