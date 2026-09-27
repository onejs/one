import type { HybridObject } from 'react-native-nitro-modules'

export type CalendarPermissionStatus =
  | 'notDetermined'
  | 'restricted'
  | 'denied'
  | 'writeOnly'
  | 'fullAccess'

export interface CalendarEventInput {
  title: string
  startMs: number
  endMs: number
  allDay: boolean
}

export interface CalendarEvent {
  identifier: string
  title: string
  startMs: number
  endMs: number
  allDay: boolean
  location: string
}

export interface OneCalendar extends HybridObject<{ ios: 'swift' }> {
  getPermissionStatus(): CalendarPermissionStatus
  requestPermission(): Promise<CalendarPermissionStatus>
  list(startMs: number, endMs: number, limit: number): Promise<CalendarEvent[]>
  create(input: CalendarEventInput): Promise<string>
  remove(identifier: string, startMs: number): Promise<void>
}
