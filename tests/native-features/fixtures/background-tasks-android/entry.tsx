import React, { useEffect, useState } from 'react'
import { AppRegistry, NativeModules, Text, View } from 'react-native'
import { Calendar } from '../../../../packages/one/src/platform/calendar/index.native'
import { BackgroundTasks } from '../../../../packages/one/src/platform/background-tasks/index.native'

// import production source directly: the shared node_modules resolves One's
// built output from the primary checkout, which can predate this proof.
const receipt = (event: string, detail: unknown = {}) =>
  NativeModules.BackgroundProof.record(JSON.stringify({ event, detail }))
const ids = ['proof.refresh', 'proof.power', 'proof.cancel', 'proof.fail']
receipt('javascript-ready')
for (const identifier of ids) {
  BackgroundTasks.defineTask(identifier, async (task) => {
    receipt('handler', {
      identifier: task.identifier,
      executionId: task.executionId,
      kind: task.kind,
      aborted: task.signal.aborted,
    })
    if (identifier === 'proof.fail') throw new Error('negative control')
  })
}

NativeModules.BackgroundProof.observeWork()

async function calendar() {
  const permission = Calendar.getRemindersPermissionStatus()
  const active = await Calendar.createReminder({ title: 'React reminder proof' })
  const completed = await Calendar.createReminder({ title: 'Completed control' })
  const deleted = await Calendar.createReminder({ title: 'Deleted control' })
  await Calendar.setReminderCompleted(completed, true)
  await Calendar.deleteReminder(deleted)
  const pending = await Calendar.listReminders()
  const all = await Calendar.listReminders(100, true)
  let invalid: unknown = 'accepted'
  try {
    await Calendar.createReminder({ title: '   ' })
  } catch (error) {
    invalid = (error as { code?: string }).code
  }
  let missing: unknown = 'accepted'
  try {
    await Calendar.deleteReminder(deleted)
  } catch (error) {
    missing = (error as { code?: string }).code
  }
  receipt('calendar', {
    permission,
    active,
    completed,
    deleted,
    pending,
    all,
    invalid,
    missing,
  })
}

async function schedule() {
  await calendar()
  const earliestBeginDateMs = Date.now() + 45_000
  await BackgroundTasks.submit('proof.refresh', { earliestBeginDateMs })
  for (const identifier of ['proof.power', 'proof.cancel', 'proof.fail']) {
    await BackgroundTasks.submit(identifier, { requiresExternalPower: true })
  }
  receipt('pending-before-cancel', await BackgroundTasks.getPending())
  BackgroundTasks.cancel('proof.cancel')
  receipt('pending-after-cancel', await BackgroundTasks.getPending())
  try {
    await BackgroundTasks.submit('proof.unknown')
    receipt('unknown-unexpectedly-accepted')
  } catch (error) {
    receipt('unknown-rejected', {
      code: (error as { code?: string }).code,
      message: String(error),
    })
  }
  receipt('scheduled', { earliestBeginDateMs })
}

function Proof() {
  const [status, setStatus] = useState('Scheduling real WorkManager requests')
  useEffect(() => {
    receipt('surface-mounted')
    schedule().then(
      () => setStatus('Scheduled. Background the app and kill its process.'),
      (error) => {
        receipt('schedule-error', String(error))
        setStatus(String(error))
      }
    )
  }, [])
  return (
    <View>
      <Text>{status}</Text>
    </View>
  )
}
AppRegistry.registerComponent('NativeFeatureTests', () => Proof)
