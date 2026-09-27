import type { CalendarEvent, CalendarEventInput as NativeCalendarEventInput, CalendarPermissionStatus } from '../specs/OneCalendar.nitro';
export type { CalendarEvent, CalendarPermissionStatus };
export type CalendarEventInput = Omit<NativeCalendarEventInput, 'allDay'> & {
    allDay?: boolean;
};
declare function getPermissionStatus(): CalendarPermissionStatus;
declare function requestPermission(): Promise<CalendarPermissionStatus>;
declare function list(startMs: number, endMs: number, limit?: number): Promise<CalendarEvent[]>;
declare function create(input: CalendarEventInput): Promise<string>;
declare function deleteEvent(identifier: string, startMs: number): Promise<void>;
export declare const Calendar: Readonly<{
    getPermissionStatus: typeof getPermissionStatus;
    requestPermission: typeof requestPermission;
    list: typeof list;
    create: typeof create;
    delete: typeof deleteEvent;
}>;
//# sourceMappingURL=index.native.d.ts.map