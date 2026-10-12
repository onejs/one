import { beforeEach, expect, test, vi } from 'vitest'

const host = vi.hoisted(() => ({
  calendar: {
    getRemindersPermissionStatus: vi.fn(() => 'notDetermined'),
    requestRemindersPermission: vi.fn(async () => 'fullAccess'),
    listReminders: vi.fn(async () => [
      { identifier: 'native-task', title: 'Native', completed: false },
    ]),
    createReminder: vi.fn(async () => 'native-task'),
    setReminderCompleted: vi.fn(async () => {}),
    removeReminder: vi.fn(async () => {}),
  },
}))
vi.mock('react-native', () => ({ Platform: { OS: 'android' } }))
vi.mock('react-native-nitro-modules', () => ({
  NitroModules: { createHybridObject: () => host.calendar },
}))
beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
})

test('Android reminders use the native permission, task and cancellation contract', async () => {
  const { Calendar } = await import('../src/platform/calendar/index.native')
  expect(Calendar.getRemindersPermissionStatus()).toBe('notDetermined')
  expect(await Calendar.requestRemindersPermission()).toBe('fullAccess')
  const input = {
    title: 'Native',
    dueMs: 123456,
    recurrence: { frequency: 'daily' as const },
  }
  expect(await Calendar.createReminder(input)).toBe('native-task')
  expect(host.calendar.createReminder).toHaveBeenCalledWith(input)
  expect(await Calendar.listReminders()).toEqual([
    { identifier: 'native-task', title: 'Native', completed: false },
  ])
  expect(host.calendar.listReminders).toHaveBeenCalledWith(100, false)
  await Calendar.listReminders(5, true)
  expect(host.calendar.listReminders).toHaveBeenLastCalledWith(5, true)
  await Calendar.setReminderCompleted('native-task', true)
  expect(host.calendar.setReminderCompleted).toHaveBeenCalledWith('native-task', true)
  await Calendar.deleteReminder('native-task')
  expect(host.calendar.removeReminder).toHaveBeenCalledWith('native-task')
})

test('Android reports native permission and unknown-identifier failures', async () => {
  const { Calendar } = await import('../src/platform/calendar/index.native')
  host.calendar.requestRemindersPermission.mockResolvedValueOnce('denied')
  expect(await Calendar.requestRemindersPermission()).toBe('denied')
  host.calendar.createReminder.mockRejectedValueOnce(
    new Error(
      'E_REMINDERS_PERMISSION: Calendar.createReminder: notification access is required\n'
    )
  )
  await expect(Calendar.createReminder({ title: 'Blocked' })).rejects.toMatchObject({
    code: 'E_REMINDERS_PERMISSION',
  })
  host.calendar.setReminderCompleted.mockRejectedValueOnce(
    new Error(
      'E_REMINDERS_NOT_FOUND: Calendar.setReminderCompleted: reminder was not found\n'
    )
  )
  await expect(Calendar.setReminderCompleted('missing', false)).rejects.toMatchObject({
    code: 'E_REMINDERS_NOT_FOUND',
  })
})
