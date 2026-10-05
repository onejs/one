import { Calendar as NativeCalendar } from './index.native'
import { Calendar as UnavailableCalendar } from './unavailable'
export type * from './index.native'

// Android implements the 6 event methods over CalendarContract. No
// Android reminders provider exists, so the 6 reminder methods keep the
// exact unavailable contract.
export const Calendar = Object.freeze({
  ...NativeCalendar,
  getRemindersPermissionStatus: UnavailableCalendar.getRemindersPermissionStatus,
  requestRemindersPermission: UnavailableCalendar.requestRemindersPermission,
  listReminders: UnavailableCalendar.listReminders,
  createReminder: UnavailableCalendar.createReminder,
  setReminderCompleted: UnavailableCalendar.setReminderCompleted,
  deleteReminder: UnavailableCalendar.deleteReminder,
})
