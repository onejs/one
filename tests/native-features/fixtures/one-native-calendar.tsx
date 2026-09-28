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
      const changedStartMs = startMs + 7_200_000
      const changedEndMs = changedStartMs + 1_800_000
      const changedTitle = `${title} edited`
      const changed = await One.iOS.Calendar.update(identifier, startMs, {
        title: changedTitle, startMs: changedStartMs, endMs: changedEndMs,
        location: 'One native room',
      })
      const cleared = await One.iOS.Calendar.update(changed.identifier, changed.startMs, {
        location: '',
      })
      const afterEdit = await One.iOS.Calendar.list(startMs - 1, changedEndMs + 1)
      const updated = changed.title === changedTitle &&
        Math.abs(changed.startMs - changedStartMs) < 1000 &&
        Math.abs(changed.endMs - changedEndMs) < 1000 &&
        changed.location === 'One native room' &&
        cleared.identifier === changed.identifier && cleared.title === changed.title &&
        Math.abs(cleared.startMs - changed.startMs) < 1000 &&
        Math.abs(cleared.endMs - changed.endMs) < 1000 && cleared.location === '' &&
        afterEdit.some((event) =>
          event.identifier === cleared.identifier &&
          event.title === changedTitle && event.location === '' &&
          Math.abs(event.startMs - changedStartMs) < 1000
        ) &&
        !afterEdit.some((event) => event.identifier === identifier &&
          Math.abs(event.startMs - startMs) < 1000)
      await One.iOS.Calendar.delete(cleared.identifier, cleared.startMs)
      const removed = !(await One.iOS.Calendar.list(startMs - 1, changedEndMs + 1)).some(
        (event) => event.identifier === cleared.identifier &&
          Math.abs(event.startMs - cleared.startMs) < 1000
      )
      let notFound = 'none'
      try {
        await One.iOS.Calendar.update(cleared.identifier, cleared.startMs, { title: 'gone' })
      } catch (error) {
        notFound = code(error)
      }
      let invalidUpdate = 'none'
      try {
        await One.iOS.Calendar.update(identifier, startMs, {})
      } catch (error) {
        invalidUpdate = code(error)
      }
      let invalid = 'none'
      try {
        await One.iOS.Calendar.list(endMs, startMs)
      } catch (error) {
        invalid = code(error)
      }
      const dayMs = 86_400_000
      const recurrenceStartMs = Date.now() + 14 * dayMs
      const recurrenceTitle = `One recurrence proof ${recurrenceStartMs}`
      await One.iOS.Calendar.create({
        title: recurrenceTitle,
        startMs: recurrenceStartMs,
        endMs: recurrenceStartMs + 3_600_000,
        recurrence: { frequency: 'daily', interval: 2, occurrenceCount: 3 },
      })
      const recurringEvents = (await One.iOS.Calendar.list(
        recurrenceStartMs - 1, recurrenceStartMs + 5 * dayMs, 100
      )).filter((event) => event.title === recurrenceTitle)
      const recurrenceListed = recurringEvents.length === 3 && recurringEvents.every((event, index) =>
        Math.abs(event.startMs - (recurrenceStartMs + index * 2 * dayMs)) < 1000 &&
        event.recurrence?.frequency === 'daily' && event.recurrence.interval === 2 &&
        event.recurrence.occurrenceCount === 3
      )
      for (const event of [...recurringEvents].reverse()) {
        await One.iOS.Calendar.delete(event.identifier, event.startMs)
      }
      const recurrenceRemoved = !(await One.iOS.Calendar.list(
        recurrenceStartMs - 1, recurrenceStartMs + 5 * dayMs, 100
      )).some((event) => event.title === recurrenceTitle)
      let invalidRecurrence = 'none'
      try {
        await One.iOS.Calendar.create({
          title: 'Invalid recurrence', startMs: recurrenceStartMs,
          endMs: recurrenceStartMs + 3_600_000,
          recurrence: { frequency: 'daily', interval: 0, occurrenceCount: 3 },
        })
      } catch (error) {
        invalidRecurrence = code(error)
      }
      setResult(`before=${before}; matched=${matched}; updated=${updated}; removed=${removed}; notFound=${notFound}; invalidUpdate=${invalidUpdate}; invalid=${invalid}; recurrenceListed=${recurrenceListed}; recurrenceRemoved=${recurrenceRemoved}; invalidRecurrence=${invalidRecurrence}`)
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
      const recurringDueMs = Date.now() + 14 * 86_400_000
      const recurringTitle = `One recurring reminder ${recurringDueMs}`
      const recurringIdentifier = await One.iOS.Calendar.createReminder({
        title: recurringTitle,
        dueMs: recurringDueMs,
        recurrence: { frequency: 'daily', interval: 2, occurrenceCount: 3 },
      })
      const recurring = (await One.iOS.Calendar.listReminders(100)).find(
        (item) => item.identifier === recurringIdentifier && item.title === recurringTitle
      )
      const recurrenceListed = recurring?.recurrence?.frequency === 'daily' &&
        recurring.recurrence.interval === 2 && recurring.recurrence.occurrenceCount === 3 &&
        Math.abs((recurring.dueMs ?? 0) - recurringDueMs) < 1000
      await One.iOS.Calendar.deleteReminder(recurringIdentifier)
      const recurrenceRemoved = !(await One.iOS.Calendar.listReminders(100, true)).some(
        (item) => item.title === recurringTitle
      )
      let invalidRecurrence = 'none'
      try {
        await One.iOS.Calendar.createReminder({
          title: 'Invalid recurring reminder',
          recurrence: { frequency: 'daily', occurrenceCount: 3 },
        })
      } catch (error) {
        invalidRecurrence = code(error)
      }
      setReminderResult(
        `before=${before}; matched=${matched}; completedHidden=${completedHidden}; updated=${updated}; removed=${removed}; notFound=${notFound}; invalid=${invalid}; invalidLimit=${invalidLimit}; recurrenceListed=${recurrenceListed}; recurrenceRemoved=${recurrenceRemoved}; invalidRecurrence=${invalidRecurrence}`
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
