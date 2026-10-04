import { missingNativeBuild } from '../nativeError'
import type {
  CalendarEvent,
  CalendarEventChanges,
  CalendarEventInput as NativeCalendarEventInput,
  CalendarPermissionStatus,
  CalendarRecurrence,
  CalendarRecurrenceFrequency,
  ReminderInfo,
  ReminderInput,
} from '../specs/OneCalendar.nitro'

export type {
  CalendarEvent,
  CalendarEventChanges,
  CalendarPermissionStatus,
  CalendarRecurrence,
  CalendarRecurrenceFrequency,
  ReminderInfo,
  ReminderInput,
}
export type CalendarEventInput = Omit<NativeCalendarEventInput, 'allDay'> & {
  allDay?: boolean
}

export const Calendar = Object.freeze({
  getPermissionStatus: (): CalendarPermissionStatus => 'denied',
  requestPermission: (): Promise<CalendarPermissionStatus> => Promise.resolve('denied'),
  list: (_startMs: number, _endMs: number, _limit = 100): Promise<CalendarEvent[]> =>
    Promise.resolve([]),
  create: (_input: CalendarEventInput): Promise<string> =>
    Promise.reject(missingNativeBuild('Calendar.create')),
  update: (
    _identifier: string,
    _originalStartMs: number,
    _changes: CalendarEventChanges
  ): Promise<CalendarEvent> => Promise.reject(missingNativeBuild('Calendar.update')),
  delete: (_identifier: string, _startMs: number): Promise<void> => Promise.resolve(),
  getRemindersPermissionStatus: (): CalendarPermissionStatus => 'denied',
  requestRemindersPermission: (): Promise<CalendarPermissionStatus> =>
    Promise.resolve('denied'),
  listReminders: (_limit = 100, _includeCompleted = false): Promise<ReminderInfo[]> =>
    Promise.resolve([]),
  createReminder: (_input: ReminderInput): Promise<string> =>
    Promise.reject(missingNativeBuild('Calendar.createReminder')),
  setReminderCompleted: (_identifier: string, _completed: boolean): Promise<void> =>
    Promise.resolve(),
  deleteReminder: (_identifier: string): Promise<void> => Promise.resolve(),
})
