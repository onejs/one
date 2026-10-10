import { Platform } from 'react-native'
import { NitroModules } from 'react-native-nitro-modules'
import { rethrowNativeError } from '../nativeError'
import type {
  CalendarEvent,
  CalendarEventChanges,
  CalendarEventInput as NativeCalendarEventInput,
  CalendarPermissionStatus,
  CalendarRecurrence,
  CalendarRecurrenceFrequency,
  OneCalendar,
  ReminderInfo,
  ReminderInput,
} from '../specs/OneCalendar.nitro'
import { Calendar as unavailableCalendar } from './unavailable'

export type { CalendarEvent, CalendarEventChanges, CalendarPermissionStatus, CalendarRecurrence, CalendarRecurrenceFrequency, ReminderInfo, ReminderInput }
export type CalendarEventInput = Omit<NativeCalendarEventInput, 'allDay'> & {
  allDay?: boolean
}

let hybrid: OneCalendar | undefined

function native(): OneCalendar {
  hybrid ??= NitroModules.createHybridObject<OneCalendar>('OneCalendar')
  return hybrid
}

function getPermissionStatus(): CalendarPermissionStatus {
  try {
    return native().getPermissionStatus()
  } catch (error) {
    return rethrowNativeError(error)
  }
}

function requestPermission(): Promise<CalendarPermissionStatus> {
  return native().requestPermission().catch(rethrowNativeError)
}

function list(startMs: number, endMs: number, limit = 100): Promise<CalendarEvent[]> {
  return native().list(startMs, endMs, limit).catch(rethrowNativeError)
}

function create(input: CalendarEventInput): Promise<string> {
  return native().create({ ...input, allDay: input.allDay ?? false }).catch(rethrowNativeError)
}

function update(
  identifier: string,
  originalStartMs: number,
  changes: CalendarEventChanges
): Promise<CalendarEvent> {
  return native().update(identifier, originalStartMs, changes).catch(rethrowNativeError)
}

function deleteEvent(identifier: string, startMs: number): Promise<void> {
  return native().remove(identifier, startMs).catch(rethrowNativeError)
}

function getRemindersPermissionStatus(): CalendarPermissionStatus {
  try {
    return native().getRemindersPermissionStatus()
  } catch (error) {
    return rethrowNativeError(error)
  }
}

function requestRemindersPermission(): Promise<CalendarPermissionStatus> {
  return native().requestRemindersPermission().catch(rethrowNativeError)
}

function listReminders(limit = 100, includeCompleted = false): Promise<ReminderInfo[]> {
  return native().listReminders(limit, includeCompleted).catch(rethrowNativeError)
}

function createReminder(input: ReminderInput): Promise<string> {
  return native().createReminder(input).catch(rethrowNativeError)
}

function setReminderCompleted(identifier: string, completed: boolean): Promise<void> {
  return native().setReminderCompleted(identifier, completed).catch(rethrowNativeError)
}

function deleteReminder(identifier: string): Promise<void> {
  return native().removeReminder(identifier).catch(rethrowNativeError)
}

const nativeCalendar = Object.freeze({
  getPermissionStatus,
  requestPermission,
  list,
  create,
  update,
  delete: deleteEvent,
  getRemindersPermissionStatus,
  requestRemindersPermission,
  listReminders,
  createReminder,
  setReminderCompleted,
  deleteReminder,
})

// Android implements the 6 event methods over CalendarContract. No
// Android reminders provider exists, so the 6 reminder methods keep the
// exact unavailable contract.
const androidCalendar = Object.freeze({
  ...nativeCalendar,
  getRemindersPermissionStatus: unavailableCalendar.getRemindersPermissionStatus,
  requestRemindersPermission: unavailableCalendar.requestRemindersPermission,
  listReminders: unavailableCalendar.listReminders,
  createReminder: unavailableCalendar.createReminder,
  setReminderCompleted: unavailableCalendar.setReminderCompleted,
  deleteReminder: unavailableCalendar.deleteReminder,
})

export const Calendar: typeof nativeCalendar =
  Platform.OS === 'android' ? androidCalendar : nativeCalendar
