import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One, useKeepAwake } from 'one'

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function HookProbe({ tag }: { tag: string }) {
  useKeepAwake(tag)
  return null
}

async function waitForAwake(expected: boolean): Promise<boolean> {
  for (let attempt = 0; attempt < 40; attempt++) {
    if ((await One.KeepAwake.isEnabled()) === expected) return true
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  return (await One.KeepAwake.isEnabled()) === expected
}

async function runChecks(
  report: (name: string, value: string) => void,
  controls: { setHook: (tag: string | null) => void }
) {
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
    await keepAwake.activate()
    report('DefaultActivate', String(await keepAwake.isEnabled()))
    await keepAwake.deactivate()
    report('DefaultDeactivate', String(await keepAwake.isEnabled()))
    await keepAwake.activate('alpha')
    await keepAwake.activate('beta')
    report('Tagged', String(await keepAwake.isEnabled()))
    await keepAwake.deactivate('alpha')
    report('Partial', String(await keepAwake.isEnabled()))
    await keepAwake.deactivate('ghost')
    report('Unknown', String(await keepAwake.isEnabled()))
    await keepAwake.deactivate('beta')
    report('Released', String(await keepAwake.isEnabled()))
    try {
      await keepAwake.activate(1 as never)
      report('InvalidActivate', 'accepted')
    } catch (error) {
      report('InvalidActivate', message(error))
    }
    try {
      await keepAwake.deactivate(1 as never)
      report('InvalidDeactivate', 'accepted')
    } catch (error) {
      report('InvalidDeactivate', message(error))
    }
    controls.setHook('hook-probe')
    report('HookHeld', String(await waitForAwake(true)))
    controls.setHook(null)
    report('HookReleased', String(await waitForAwake(false)))
  } finally {
    controls.setHook(null)
    await keepAwake.setEnabled(initial)
    report('Restored', String(await keepAwake.isEnabled()))
  }
}

export default function OneNativeKeepAwake() {
  const [results, setResults] = useState<[string, string][]>([])
  const [status, setStatus] = useState('idle')
  const [hookTag, setHookTag] = useState<string | null>(null)

  return (
    <View style={styles.screen}>
      <Text>{`Status: ${status}`}</Text>
      {results.map(([name, value]) => (
        <Text key={name}>{`${name}: ${value}`}</Text>
      ))}
      {hookTag ? <HookProbe tag={hookTag} /> : null}
      <Pressable
        testID="one-native-keep-awake-run"
        style={styles.chip}
        onPress={() => {
          setResults([])
          setStatus('running')
          runChecks(
            (name, value) => setResults((current) => [...current, [name, value]]),
            { setHook: setHookTag }
          ).then(
            () => setStatus('done'),
            (error: unknown) => setStatus(`failed ${message(error)}`)
          )
        }}
      >
        <Text>Run keep-awake checks</Text>
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
