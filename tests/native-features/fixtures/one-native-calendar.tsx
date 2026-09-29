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
  const [reminderPermission, setReminderPermission] = useState(
    One.iOS.Calendar.getRemindersPermissionStatus()
  )
  const [reminderStatus, setReminderStatus] = useState('idle')
  const [reminderResult, setReminderResult] = useState('pending')

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

  const runReminders = async () => {
    setReminderStatus('running')
    try {
      let before = 'none'
      try {
        await One.iOS.Calendar.listReminders()
      } catch (error) {
        before = code(error)
      }
      const granted = await One.iOS.Calendar.requestRemindersPermission()
      setReminderPermission(granted)
      if (granted !== 'fullAccess') {
        setReminderStatus('denied')
        setReminderResult(`before=${before}`)
        return
      }
      const dueMs = Date.now() + 7 * 86_400_000
      const title = `One reminder proof ${dueMs}`
      const identifier = await One.iOS.Calendar.createReminder({ title, dueMs })
      const listed = await One.iOS.Calendar.listReminders()
      const matched = listed.some(
        (item) => item.identifier === identifier && item.title === title &&
          !item.completed && Math.abs((item.dueMs ?? 0) - dueMs) < 1_000
      )
      await One.iOS.Calendar.setReminderCompleted(identifier, true)
      const completedHidden = !(await One.iOS.Calendar.listReminders()).some(
        (item) => item.identifier === identifier
      )
      const updated = (await One.iOS.Calendar.listReminders(100, true)).some(
        (item) => item.identifier === identifier && item.completed
      )
      await One.iOS.Calendar.deleteReminder(identifier)
      const removed = !(await One.iOS.Calendar.listReminders(100, true)).some(
        (item) => item.identifier === identifier
      )
      let notFound = 'none'
      try {
        await One.iOS.Calendar.setReminderCompleted(identifier, false)
      } catch (error) {
        notFound = code(error)
      }
      let invalid = 'none'
      try {
        await One.iOS.Calendar.createReminder({ title: ' ' })
      } catch (error) {
        invalid = code(error)
      }
      let invalidLimit = 'none'
      try {
        await One.iOS.Calendar.listReminders(0)
      } catch (error) {
        invalidLimit = code(error)
      }
      setReminderResult(
        `before=${before}; matched=${matched}; completedHidden=${completedHidden}; updated=${updated}; removed=${removed}; notFound=${notFound}; invalid=${invalid}; invalidLimit=${invalidLimit}`
      )
      setReminderStatus('done')
    } catch (error) {
      setReminderStatus(`failed ${code(error)}`)
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
      <Text>{`Reminders permission: ${reminderPermission}`}</Text>
      <Text>{`Reminders status: ${reminderStatus}`}</Text>
      <Text>{`Reminders result: ${reminderResult}`}</Text>
      <Pressable testID="one-native-reminders-run" style={styles.button} onPress={runReminders}>
        <Text>Run reminder checks</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 8 },
  button: { padding: 12, backgroundColor: '#eee', borderRadius: 8, alignSelf: 'flex-start' },
})
