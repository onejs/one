import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

async function runChecks(report: (name: string, value: string) => void) {
  const brightness = One.Brightness
  report('Available', String(brightness.isAvailable()))
  const initial = await brightness.get()
  report('Initial', String(initial))
  try {
    await brightness.set(0.5)
    const mid = await brightness.get()
    report('Mid', String(mid))
    report('Roundtrip', String(Math.abs(mid - 0.5) < 0.02))
  } finally {
    await brightness.set(initial)
    report('Restored', String(await brightness.get()))
  }
  const heard: number[] = []
  const subscription = brightness.addListener((event) => {
    heard.push(event.brightness)
  })
  await brightness.set(0.4)
  await new Promise((resolve) => setTimeout(resolve, 1500))
  await brightness.set(initial)
  subscription.remove()
  report('Heard04', String(heard.some((value) => Math.abs(value - 0.4) < 0.02)))
  report('SystemMode', await brightness.getSystemMode())
  report('UsingSystem', String(await brightness.isUsingSystem()))
  const permissions = await brightness.getPermissions()
  report(
    'Permissions',
    `${permissions.status}|${permissions.granted}|${permissions.canAskAgain}`
  )
  const sysInitial = await brightness.getSystem()
  try {
    await brightness.setSystem(0.5)
    report('SystemSet', String(await brightness.getSystem()))
  } catch (error) {
    report('SystemSet', message(error))
  } finally {
    try {
      await brightness.setSystem(sysInitial)
    } catch {
      // without the settings grant there is nothing to restore
    }
  }
  try {
    Reflect.apply(brightness.set, undefined, [2])
    report('Invalid', 'accepted')
  } catch (error) {
    report('Invalid', message(error))
  }
  try {
    Reflect.apply(brightness.setSystemMode, undefined, ['unknown'])
    report('InvalidMode', 'accepted')
  } catch (error) {
    report('InvalidMode', message(error))
  }
}

export default function OneNativeBrightness() {
  const [results, setResults] = useState<[string, string][]>([])
  const [status, setStatus] = useState('idle')

  return (
    <View style={styles.screen}>
      <Text>{`Status: ${status}`}</Text>
      {results.map(([name, value]) => (
        <Text key={name}>{`${name}: ${value}`}</Text>
      ))}
      <Pressable
        testID="one-native-brightness-run"
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
        <Text>Run brightness checks</Text>
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
