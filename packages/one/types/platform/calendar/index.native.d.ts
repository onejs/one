import type { CalendarEvent, CalendarEventChanges, CalendarEventInput as NativeCalendarEventInput, CalendarPermissionStatus, CalendarRecurrence, CalendarRecurrenceFrequency, ReminderInfo, ReminderInput } from '../specs/OneCalendar.nitro';
export type { CalendarEvent, CalendarEventChanges, CalendarPermissionStatus, CalendarRecurrence, CalendarRecurrenceFrequency, ReminderInfo, ReminderInput };
export type CalendarEventInput = Omit<NativeCalendarEventInput, 'allDay'> & {
    allDay?: boolean;
};
declare function getPermissionStatus(): CalendarPermissionStatus;
declare function requestPermission(): Promise<CalendarPermissionStatus>;
declare function list(startMs: number, endMs: number, limit?: number): Promise<CalendarEvent[]>;
declare function create(input: CalendarEventInput): Promise<string>;
declare function update(identifier: string, originalStartMs: number, changes: CalendarEventChanges): Promise<CalendarEvent>;
declare function deleteEvent(identifier: string, startMs: number): Promise<void>;
declare function getRemindersPermissionStatus(): CalendarPermissionStatus;
declare function requestRemindersPermission(): Promise<CalendarPermissionStatus>;
declare function listReminders(limit?: number, includeCompleted?: boolean): Promise<ReminderInfo[]>;
declare function createReminder(input: ReminderInput): Promise<string>;
declare function setReminderCompleted(identifier: string, completed: boolean): Promise<void>;
declare function deleteReminder(identifier: string): Promise<void>;
export declare const Calendar: Readonly<{
    getPermissionStatus: typeof getPermissionStatus;
    requestPermission: typeof requestPermission;
    list: typeof list;
    create: typeof create;
    update: typeof update;
    delete: typeof deleteEvent;
    getRemindersPermissionStatus: typeof getRemindersPermissionStatus;
    requestRemindersPermission: typeof requestRemindersPermission;
    listReminders: typeof listReminders;
    createReminder: typeof createReminder;
    setReminderCompleted: typeof setReminderCompleted;
    deleteReminder: typeof deleteReminder;
}>;
//# sourceMappingURL=index.native.d.ts.map