import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

async function runChecks(report: (name: string, value: string) => void) {
  const sensor = One.LightSensor
  report('Available', String(sensor.isAvailable()))
  sensor.setUpdateInterval(100)
  report('Interval', 'set')
  const seen: string[] = []
  const subscription = sensor.addListener((event) =>
    seen.push(`${event.illuminance}|${event.timestamp > 0}`)
  )
  await new Promise((resolve) => setTimeout(resolve, 1500))
  subscription.remove()
  report('Events', seen.length === 0 ? 'none' : seen.join(','))
  try {
    Reflect.apply(sensor.addListener, undefined, [1])
    report('Invalid', 'accepted')
  } catch (error) {
    report('Invalid', message(error))
  }
  try {
    Reflect.apply(sensor.setUpdateInterval, undefined, [-1])
    report('InvalidInterval', 'accepted')
  } catch (error) {
    report('InvalidInterval', message(error))
  }
}

export default function OneNativeLightSensor() {
  const [results, setResults] = useState<[string, string][]>([])
  const [status, setStatus] = useState('idle')

  return (
    <View style={styles.screen}>
      <Text>{`Status: ${status}`}</Text>
      {results.map(([name, value]) => (
        <Text key={name}>{`${name}: ${value}`}</Text>
      ))}
      <Pressable
        testID="one-native-light-sensor-run"
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
        <Text>Run light sensor checks</Text>
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
