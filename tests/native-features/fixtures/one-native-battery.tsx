import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import {
  One,
  useBatteryLevel,
  useBatteryState,
  useLowPowerMode,
  usePowerState,
} from 'one'

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

async function runChecks(report: (name: string, value: string) => void) {
  const battery = One.Battery
  report('Available', String(battery.isAvailable()))
  const level = await battery.getLevel()
  report('Level', String(level))
  const state = await battery.getState()
  report('State', state)
  const power = await battery.getPowerState()
  report('Power', `${power.batteryLevel}|${power.batteryState}|${power.lowPowerMode}`)
  const lowPower = await battery.isLowPowerModeEnabled()
  report('LowPower', String(lowPower))
  report(
    'Agreement',
    String(
      power.batteryLevel === level &&
        power.batteryState === state &&
        power.lowPowerMode === lowPower
    )
  )
  const seen: string[] = []
  const levelSub = battery.addLevelListener((event) =>
    seen.push(`level:${event.batteryLevel}`)
  )
  const stateSub = battery.addStateListener((event) =>
    seen.push(`state:${event.batteryState}`)
  )
  const modeSub = battery.addLowPowerModeListener((event) =>
    seen.push(`mode:${event.lowPowerMode}`)
  )
  levelSub.remove()
  stateSub.remove()
  modeSub.remove()
  report('Listeners', seen.length === 0 ? 'attached' : seen.join(','))
  try {
    Reflect.apply(battery.addLevelListener, undefined, [1])
    report('Invalid', 'accepted')
  } catch (error) {
    report('Invalid', message(error))
  }
}

export default function OneNativeBattery() {
  const [results, setResults] = useState<[string, string][]>([])
  const [status, setStatus] = useState('idle')
  const hookLevel = useBatteryLevel()
  const hookState = useBatteryState()
  const hookMode = useLowPowerMode()
  const hookPower = usePowerState()

  return (
    <View style={styles.screen}>
      <Text>{`Status: ${status}`}</Text>
      <Text>{`HookLevel: ${hookLevel}`}</Text>
      <Text>{`HookState: ${hookState}`}</Text>
      <Text>{`HookMode: ${hookMode}`}</Text>
      <Text>{`HookPower: ${hookPower.batteryLevel}|${hookPower.batteryState}|${hookPower.lowPowerMode}`}</Text>
      {results.map(([name, value]) => (
        <Text key={name}>{`${name}: ${value}`}</Text>
      ))}
      <Pressable
        testID="one-native-battery-run"
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
        <Text>Run battery checks</Text>
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
