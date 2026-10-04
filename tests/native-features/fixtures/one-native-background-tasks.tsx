import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

const refreshId = 'dev.vxrn.native.tests.refresh'
const processingId = 'dev.vxrn.native.tests.processing'

async function codeOf(work: Promise<unknown>): Promise<string> {
  try {
    await work
    return 'resolved'
  } catch (error) {
    return error instanceof Error && 'code' in error && typeof error.code === 'string'
      ? error.code : String(error)
  }
}

export default function OneNativeBackgroundTasks() {
  const [schedule, setSchedule] = useState('pending')
  const [callback, setCallback] = useState('pending')

  const runSchedule = async () => {
    try {
      const api = One.BackgroundTasks
      const earliest = Date.now() + 60_000
      const refresh = await codeOf(api.submit(refreshId, { earliestBeginDateMs: earliest }))
      const refreshPending = (await api.getPending()).some((task) => task.identifier === refreshId)
      api.cancel(refreshId)
      const refreshGone = !(await api.getPending()).some((task) => task.identifier === refreshId)
      const processing = await codeOf(api.submit(processingId, {
        requiresNetworkConnectivity: true,
        requiresExternalPower: true,
      }))
      const processingPending = (await api.getPending()).some((task) => task.identifier === processingId)
      api.cancel(processingId)
      const processingGone = !(await api.getPending()).some((task) => task.identifier === processingId)
      const invalid = await codeOf(api.submit('dev.vxrn.native.tests.unknown'))
      setSchedule(`refresh=${refresh} pending=${refreshPending} cancelled=${refreshGone} processing=${processing} pending=${processingPending} cancelled=${processingGone} invalid=${invalid}`)
    } catch (error) {
      setSchedule(`error=${String(error)}`)
    }
  }

  return (
    <View style={styles.screen}>
      <Text>Schedule: {schedule}</Text>
      <Text>Callback: {callback}</Text>
      <Pressable testID="one-native-background-tasks-run" onPress={runSchedule}>
        <Text>Schedule and cancel</Text>
      </Pressable>
      <Pressable testID="one-native-background-tasks-read" onPress={() =>
        setCallback(globalThis.__oneBackgroundTaskProof ?? 'none')}>
        <Text>Read callback</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 16, backgroundColor: '#fff' },
})
