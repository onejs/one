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

export type { CalendarEvent, CalendarEventChanges, CalendarPermissionStatus, CalendarRecurrence, CalendarRecurrenceFrequency, ReminderInfo, ReminderInput }
export type CalendarEventInput = Omit<NativeCalendarEventInput, 'allDay'> & {
  allDay?: boolean
}

const unsupported = (): never => {
  throw new Error('Calendar requires an iOS native build')
}

export const Calendar = Object.freeze({
  getPermissionStatus: (): CalendarPermissionStatus => unsupported(),
  requestPermission: (): Promise<CalendarPermissionStatus> => unsupported(),
  list: (_startMs: number, _endMs: number, _limit = 100): Promise<CalendarEvent[]> => unsupported(),
  create: (_input: CalendarEventInput): Promise<string> => unsupported(),
  update: (_identifier: string, _originalStartMs: number, _changes: CalendarEventChanges): Promise<CalendarEvent> => unsupported(),
  delete: (_identifier: string, _startMs: number): Promise<void> => unsupported(),
  getRemindersPermissionStatus: (): CalendarPermissionStatus => unsupported(),
  requestRemindersPermission: (): Promise<CalendarPermissionStatus> => unsupported(),
  listReminders: (_limit = 100, _includeCompleted = false): Promise<ReminderInfo[]> => unsupported(),
  createReminder: (_input: ReminderInput): Promise<string> => unsupported(),
  setReminderCompleted: (_identifier: string, _completed: boolean): Promise<void> => unsupported(),
  deleteReminder: (_identifier: string): Promise<void> => unsupported(),
})
