import type { CalendarEvent, CalendarEventInput as NativeCalendarEventInput, CalendarPermissionStatus } from '../specs/OneCalendar.nitro';
export type { CalendarEvent, CalendarPermissionStatus };
export type CalendarEventInput = Omit<NativeCalendarEventInput, 'allDay'> & {
    allDay?: boolean;
};
export declare const Calendar: Readonly<{
    getPermissionStatus: () => CalendarPermissionStatus;
    requestPermission: () => Promise<CalendarPermissionStatus>;
    list: (_startMs: number, _endMs: number, _limit?: number) => Promise<CalendarEvent[]>;
    create: (_input: CalendarEventInput) => Promise<string>;
    delete: (_identifier: string, _startMs: number) => Promise<void>;
}>;
//# sourceMappingURL=index.d.ts.map