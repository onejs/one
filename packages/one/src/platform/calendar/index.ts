import type {
  CalendarEvent,
  CalendarEventInput as NativeCalendarEventInput,
  CalendarPermissionStatus,
} from '../specs/OneCalendar.nitro'

export type { CalendarEvent, CalendarPermissionStatus }
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
  delete: (_identifier: string, _startMs: number): Promise<void> => unsupported(),
})
