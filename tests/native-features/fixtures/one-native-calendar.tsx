import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

function code(error: unknown): string {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String(error.code)
    : String(error)
}

export default function OneNativeCalendar() {
  const [permission, setPermission] = useState(One.iOS.Calendar.getPermissionStatus())
  const [status, setStatus] = useState('idle')
  const [result, setResult] = useState('pending')

  const run = async () => {
    setStatus('running')
    try {
      let before = 'none'
      try {
        await One.iOS.Calendar.list(Date.now(), Date.now() + 86_400_000)
      } catch (error) {
        before = code(error)
      }
      const granted = await One.iOS.Calendar.requestPermission()
      setPermission(granted)
      if (granted !== 'fullAccess') {
        setStatus('denied')
        setResult(`before=${before}`)
        return
      }
      const startMs = Date.now() + 7 * 86_400_000
      const endMs = startMs + 3_600_000
      const title = `One calendar proof ${startMs}`
      const identifier = await One.iOS.Calendar.create({ title, startMs, endMs })
      const events = await One.iOS.Calendar.list(startMs - 1, endMs + 1)
      const matched = events.some(
        (event) =>
          event.identifier === identifier &&
          event.title === title &&
          Math.abs(event.startMs - startMs) < 1000 &&
          Math.abs(event.endMs - endMs) < 1000 &&
          !event.allDay
      )
      await One.iOS.Calendar.delete(identifier, startMs)
      const removed = !(await One.iOS.Calendar.list(startMs - 1, endMs + 1)).some(
        (event) => event.identifier === identifier
      )
      let invalid = 'none'
      try {
        await One.iOS.Calendar.list(endMs, startMs)
      } catch (error) {
        invalid = code(error)
      }
      setResult(`before=${before}; matched=${matched}; removed=${removed}; invalid=${invalid}`)
      setStatus('done')
    } catch (error) {
      setStatus(`failed ${code(error)}`)
    }
  }

  return (
    <View style={styles.screen}>
      <Text>{`Permission: ${permission}`}</Text>
      <Text>{`Status: ${status}`}</Text>
      <Text>{`Result: ${result}`}</Text>
      <Pressable testID="one-native-calendar-run" style={styles.button} onPress={run}>
        <Text>Run calendar checks</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 8 },
  button: { padding: 12, backgroundColor: '#eee', borderRadius: 8, alignSelf: 'flex-start' },
})
