import {
  Bundle,
  Calendar as NativeCalendar,
  CharacterSet,
  NSError,
  NSString,
} from 'one/ios/Foundation'
import {
  EKEvent,
  EKEventStore,
  EKRecurrenceEnd,
  EKRecurrenceRule,
  EKReminder,
  type EKCalendarItem,
} from 'one/ios/EventKit'
import type {
  CalendarEvent,
  CalendarEventChanges,
  CalendarEventInput,
  CalendarPermissionStatus,
  CalendarRecurrence,
  ReminderInfo,
  ReminderInput,
} from '../specs/OneCalendar.nitro'

let eventStore: EKEventStore | undefined
const store = () => (eventStore ??= EKEventStore.init())
const trim = (value: string) =>
  NSString.initString(value).trimmingCharacters(CharacterSet.whitespacesAndNewlines)
const finiteTime = (value: number) =>
  Number.isFinite(value) && Math.abs(value) <= 8_640_000_000_000_000
const whole = (value: number, maximum: number) =>
  Number.isInteger(value) && value >= 1 && value <= maximum

function failure(code: string, operation: string, detail: string): Error {
  return Object.assign(new Error(`Calendar.${operation}: ${detail}`), {
    code: `E_${code}`,
  })
}

function detail(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function getPermissionStatus(): CalendarPermissionStatus {
  return EKEventStore.authorizationStatus('event')
}

function getRemindersPermissionStatus(): CalendarPermissionStatus {
  return EKEventStore.authorizationStatus('reminder')
}

function access(operation: string, reminders = false, needsAccess = true): void {
  const key = reminders
    ? 'NSRemindersFullAccessUsageDescription'
    : 'NSCalendarsFullAccessUsageDescription'
  const usage = Bundle.main.object(key)
  const prefix = reminders ? 'REMINDERS' : 'CALENDAR'
  if (typeof usage !== 'string' || !trim(usage)) {
    throw failure(
      `${prefix}_MANIFEST`,
      operation,
      `set native.app.calendar.${reminders ? 'remindersUsage' : 'usage'}`
    )
  }
  if (
    needsAccess &&
    (reminders ? getRemindersPermissionStatus() : getPermissionStatus()) !== 'fullAccess'
  ) {
    throw failure(
      `${prefix}_PERMISSION`,
      operation,
      `full ${reminders ? 'reminders' : 'calendar'} access is required`
    )
  }
}

function request(reminders: boolean): Promise<CalendarPermissionStatus> {
  const operation = reminders ? 'requestRemindersPermission' : 'requestPermission'
  return new Promise((resolve, reject) => {
    access(operation, reminders, false)
    const completion = (
      _granted: boolean,
      error: { $handle: NSError['$handle'] } | null
    ) => {
      const status = reminders ? getRemindersPermissionStatus() : getPermissionStatus()
      if (status === 'notDetermined' && error) {
        reject(
          failure(
            `${reminders ? 'REMINDERS' : 'CALENDAR'}_PERMISSION`,
            operation,
            new NSError(error.$handle).localizedDescription
          )
        )
      } else resolve(status)
    }
    if (reminders) store().requestFullAccessToReminders(completion)
    else store().requestFullAccessToEvents(completion)
  })
}

function recurrenceInfo(item: EKCalendarItem): CalendarRecurrence | undefined {
  const rule = item.recurrenceRules?.[0]
  if (!rule || !['daily', 'weekly', 'monthly', 'yearly'].includes(rule.frequency)) return
  const end = rule.recurrenceEnd
  return {
    frequency: rule.frequency,
    interval: rule.interval,
    endDateMs: end?.endDate?.getTime(),
    occurrenceCount: end && end.occurrenceCount > 0 ? end.occurrenceCount : undefined,
  }
}

function recurrenceRule(
  value: CalendarRecurrence,
  startMs: number
): EKRecurrenceRule | null {
  const interval = value.interval ?? 1
  if (
    !whole(interval, 1_000) ||
    (value.endDateMs !== undefined && value.occurrenceCount !== undefined) ||
    (value.endDateMs !== undefined &&
      (!Number.isFinite(value.endDateMs) ||
        value.endDateMs < startMs ||
        value.endDateMs > 8_640_000_000_000_000)) ||
    (value.occurrenceCount !== undefined && !whole(value.occurrenceCount, 10_000))
  )
    return null
  const end =
    value.occurrenceCount !== undefined
      ? EKRecurrenceEnd.initOccurrenceCount(value.occurrenceCount)
      : value.endDateMs !== undefined
        ? EKRecurrenceEnd.initEnd(new Date(value.endDateMs))
        : undefined
  return EKRecurrenceRule.initRecurrenceWithIntervalEnd(value.frequency, interval, end)
}

function info(event: EKEvent): CalendarEvent | undefined {
  const identifier = event.eventIdentifier
  if (identifier === null) return
  return {
    identifier,
    title: event.title ?? '',
    startMs: event.startDate!.getTime(),
    endMs: event.endDate!.getTime(),
    allDay: event.isAllDay,
    location: event.location ?? '',
    recurrence: recurrenceInfo(event),
  }
}

function occurrence(identifier: string, startMs: number): EKEvent | undefined {
  const predicate = store().predicateForEvents(
    new Date(startMs - 1_000),
    new Date(startMs + 1_000)
  )
  return store()
    .events(predicate)
    .find(
      (event) =>
        event.eventIdentifier === identifier &&
        Math.abs(event.startDate!.getTime() - startMs) < 1_000
    )
}

async function list(
  startMs: number,
  endMs: number,
  limit: number
): Promise<CalendarEvent[]> {
  access('list')
  if (
    !Number.isFinite(startMs) ||
    !Number.isFinite(endMs) ||
    endMs <= startMs ||
    endMs - startMs > 366 * 86_400_000 ||
    !whole(limit, 500)
  ) {
    throw failure(
      'CALENDAR_INPUT',
      'list',
      'use a range up to 366 days and a limit from 1 to 500'
    )
  }
  const events = store().events(
    store().predicateForEvents(new Date(startMs), new Date(endMs))
  )
  return events
    .sort((a, b) => a.startDate!.getTime() - b.startDate!.getTime())
    .slice(0, limit)
    .flatMap((event) => {
      const result = info(event)
      return result ? [result] : []
    })
}

async function create(input: CalendarEventInput): Promise<string> {
  access('create')
  const title = trim(input.title)
  if (
    !title ||
    !Number.isFinite(input.startMs) ||
    !Number.isFinite(input.endMs) ||
    input.endMs <= input.startMs
  ) {
    throw failure(
      'CALENDAR_INPUT',
      'create',
      'title and increasing finite times are required'
    )
  }
  const rule = input.recurrence
    ? recurrenceRule(input.recurrence, input.startMs)
    : undefined
  if (rule === null)
    throw failure(
      'CALENDAR_INPUT',
      'create',
      'recurrence needs a whole-number interval and one valid end'
    )
  const calendar = store().defaultCalendarForNewEvents
  if (!calendar)
    throw failure('CALENDAR_UNAVAILABLE', 'create', 'no writable calendar is available')
  const event = EKEvent.init(store())
  event.calendar = calendar
  event.title = title
  event.startDate = new Date(input.startMs)
  event.endDate = new Date(input.endMs)
  event.isAllDay = input.allDay
  if (rule) event.addRecurrenceRule(rule)
  try {
    store().saveSpanCommit(event, 'thisEvent', true)
  } catch (error) {
    throw failure('CALENDAR_SAVE', 'create', detail(error))
  }
  const identifier = event.eventIdentifier
  if (identifier === null)
    throw failure('CALENDAR_SAVE', 'create', 'saved event has no identifier')
  return identifier
}

async function update(
  identifier: string,
  originalStartMs: number,
  changes: CalendarEventChanges
): Promise<CalendarEvent> {
  access('update')
  if (
    !trim(identifier) ||
    !finiteTime(originalStartMs) ||
    [
      changes.title,
      changes.startMs,
      changes.endMs,
      changes.allDay,
      changes.location,
    ].every((value) => value === undefined)
  ) {
    throw failure(
      'CALENDAR_INPUT',
      'update',
      'an event and at least one change are required'
    )
  }
  const event = occurrence(identifier, originalStartMs)
  if (!event)
    throw failure('CALENDAR_NOT_FOUND', 'update', 'event occurrence was not found')
  const startMs = changes.startMs ?? event.startDate!.getTime()
  const endMs = changes.endMs ?? event.endDate!.getTime()
  if (!finiteTime(startMs) || !finiteTime(endMs) || endMs <= startMs) {
    throw failure('CALENDAR_INPUT', 'update', 'increasing finite times are required')
  }
  if (changes.title !== undefined) {
    const title = trim(changes.title)
    if (!title) throw failure('CALENDAR_INPUT', 'update', 'title cannot be empty')
    event.title = title
  }
  event.startDate = new Date(startMs)
  event.endDate = new Date(endMs)
  event.isAllDay = changes.allDay ?? event.isAllDay
  if (changes.location !== undefined) event.location = changes.location
  try {
    store().saveSpanCommit(event, 'thisEvent', true)
  } catch (error) {
    throw failure('CALENDAR_SAVE', 'update', detail(error))
  }
  const result = info(event)
  if (!result) throw failure('CALENDAR_SAVE', 'update', 'saved event has no identifier')
  return result
}

async function remove(identifier: string, startMs: number): Promise<void> {
  access('delete')
  if (!trim(identifier) || !finiteTime(startMs))
    throw failure(
      'CALENDAR_INPUT',
      'delete',
      'identifier and finite start time are required'
    )
  const event = occurrence(identifier, startMs)
  if (!event)
    throw failure('CALENDAR_NOT_FOUND', 'delete', 'event occurrence was not found')
  try {
    store().removeSpanCommit(event, 'thisEvent', true)
  } catch (error) {
    throw failure('CALENDAR_DELETE', 'delete', detail(error))
  }
}

function dueDate(reminder: EKReminder): Date | null {
  const components = reminder.dueDateComponents
  return components ? NativeCalendar.current.dateFrom(components) : null
}

function reminderInfo(reminder: EKReminder, date = dueDate(reminder)): ReminderInfo {
  return {
    identifier: reminder.calendarItemIdentifier,
    title: reminder.title ?? '',
    completed: reminder.isCompleted,
    dueMs: date?.getTime(),
    recurrence: recurrenceInfo(reminder),
  }
}

async function listReminders(
  limit: number,
  includeCompleted: boolean
): Promise<ReminderInfo[]> {
  access('listReminders', true)
  if (!whole(limit, 500))
    throw failure(
      'REMINDERS_INPUT',
      'listReminders',
      'use a whole-number limit from 1 to 500'
    )
  const predicate = includeCompleted
    ? store().predicateForReminders()
    : store().predicateForIncompleteReminders()
  return new Promise((resolve, reject) => {
    store().fetchReminders(predicate, (reminders) => {
      try {
        const dated = (reminders ?? []).map((reminder) => ({
          reminder,
          date: dueDate(reminder),
        }))
        dated.sort((a, b) => {
          const left = a.date?.getTime(),
            right = b.date?.getTime()
          if (left !== right) return (left ?? Infinity) - (right ?? Infinity)
          return NSString.initString(a.reminder.title ?? '').compare(
            b.reminder.title ?? ''
          ) === 'orderedAscending'
            ? -1
            : (a.reminder.title ?? '') === (b.reminder.title ?? '')
              ? 0
              : 1
        })
        resolve(
          dated.slice(0, limit).map(({ reminder, date }) => reminderInfo(reminder, date))
        )
      } catch (error) {
        reject(error)
      }
    })
  })
}

async function createReminder(input: ReminderInput): Promise<string> {
  access('createReminder', true)
  const title = trim(input.title)
  if (!title || (input.dueMs !== undefined && !finiteTime(input.dueMs))) {
    throw failure(
      'REMINDERS_INPUT',
      'createReminder',
      'use a non-empty title and finite due time when supplied'
    )
  }
  const rule =
    input.recurrence && input.dueMs !== undefined
      ? recurrenceRule(input.recurrence, input.dueMs)
      : undefined
  if (input.recurrence && !rule)
    throw failure(
      'REMINDERS_INPUT',
      'createReminder',
      'recurrence needs a due time and a valid rule'
    )
  const calendar = store().defaultCalendarForNewReminders()
  if (!calendar)
    throw failure(
      'REMINDERS_UNAVAILABLE',
      'createReminder',
      'no writable reminders list is available'
    )
  const reminder = EKReminder.init(store())
  reminder.calendar = calendar
  reminder.title = title
  if (input.dueMs !== undefined)
    reminder.dueDateComponents = NativeCalendar.current.dateComponentsFrom(
      ['year', 'month', 'day', 'hour', 'minute', 'second', 'timeZone'],
      new Date(input.dueMs)
    )
  if (rule) reminder.addRecurrenceRule(rule)
  try {
    store().saveCommit(reminder, true)
  } catch (error) {
    throw failure('REMINDERS_SAVE', 'createReminder', detail(error))
  }
  return reminder.calendarItemIdentifier
}

function findReminder(identifier: string, operation: string): EKReminder {
  access(operation, true)
  if (!trim(identifier))
    throw failure('REMINDERS_INPUT', operation, 'identifier is required')
  const item = store().calendarItem(identifier)
  if (!(item instanceof EKReminder))
    throw failure('REMINDERS_NOT_FOUND', operation, 'reminder was not found')
  return item
}

async function setReminderCompleted(
  identifier: string,
  completed: boolean
): Promise<void> {
  const reminder = findReminder(identifier, 'setReminderCompleted')
  reminder.isCompleted = completed
  try {
    store().saveCommit(reminder, true)
  } catch (error) {
    throw failure('REMINDERS_SAVE', 'setReminderCompleted', detail(error))
  }
}

async function removeReminder(identifier: string): Promise<void> {
  const reminder = findReminder(identifier, 'deleteReminder')
  try {
    store().removeCommit(reminder, true)
  } catch (error) {
    throw failure('REMINDERS_DELETE', 'deleteReminder', detail(error))
  }
}

export function calendarNative() {
  return {
    getPermissionStatus,
    requestPermission: () => request(false),
    list,
    create,
    update,
    remove,
    getRemindersPermissionStatus,
    requestRemindersPermission: () => request(true),
    listReminders,
    createReminder,
    setReminderCompleted,
    removeReminder,
  }
}
