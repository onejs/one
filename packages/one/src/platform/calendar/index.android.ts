import { Calendar as NativeCalendar } from './index.native'
import { Calendar as UnavailableCalendar } from './unavailable'
export type * from './index.native'

export const Calendar = Object.freeze({
  ...NativeCalendar,
  getRemindersPermissionStatus: UnavailableCalendar.getRemindersPermissionStatus,
  requestRemindersPermission: UnavailableCalendar.requestRemindersPermission,
  listReminders: UnavailableCalendar.listReminders,
  createReminder: UnavailableCalendar.createReminder,
  setReminderCompleted: UnavailableCalendar.setReminderCompleted,
  deleteReminder: UnavailableCalendar.deleteReminder,
})
