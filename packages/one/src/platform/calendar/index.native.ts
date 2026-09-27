import { Platform } from 'react-native'
import { NitroModules } from 'react-native-nitro-modules'
import { rethrowNativeError } from '../nativeError'
import type {
  CalendarEvent,
  CalendarEventInput as NativeCalendarEventInput,
  CalendarPermissionStatus,
  OneCalendar,
} from '../specs/OneCalendar.nitro'

export type { CalendarEvent, CalendarPermissionStatus }
export type CalendarEventInput = Omit<NativeCalendarEventInput, 'allDay'> & {
  allDay?: boolean
}

let hybrid: OneCalendar | undefined

function native(): OneCalendar {
  if (Platform.OS !== 'ios') throw new Error('Calendar requires an iOS native build')
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

function deleteEvent(identifier: string, startMs: number): Promise<void> {
  return native().remove(identifier, startMs).catch(rethrowNativeError)
}

export const Calendar = Object.freeze({
  getPermissionStatus,
  requestPermission,
  list,
  create,
  delete: deleteEvent,
})
