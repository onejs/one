import type { CalendarEvent, CalendarEventChanges, CalendarEventInput as NativeCalendarEventInput, CalendarPermissionStatus, CalendarRecurrence, CalendarRecurrenceFrequency, ReminderInfo, ReminderInput } from '../specs/OneCalendar.nitro';
export type { CalendarEvent, CalendarEventChanges, CalendarPermissionStatus, CalendarRecurrence, CalendarRecurrenceFrequency, ReminderInfo, ReminderInput };
export type CalendarEventInput = Omit<NativeCalendarEventInput, 'allDay'> & {
    allDay?: boolean;
};
export declare const Calendar: Readonly<{
    getPermissionStatus: () => CalendarPermissionStatus;
    requestPermission: () => Promise<CalendarPermissionStatus>;
    list: (_startMs: number, _endMs: number, _limit?: number) => Promise<CalendarEvent[]>;
    create: (_input: CalendarEventInput) => Promise<string>;
    update: (_identifier: string, _originalStartMs: number, _changes: CalendarEventChanges) => Promise<CalendarEvent>;
    delete: (_identifier: string, _startMs: number) => Promise<void>;
    getRemindersPermissionStatus: () => CalendarPermissionStatus;
    requestRemindersPermission: () => Promise<CalendarPermissionStatus>;
    listReminders: (_limit?: number, _includeCompleted?: boolean) => Promise<ReminderInfo[]>;
    createReminder: (_input: ReminderInput) => Promise<string>;
    setReminderCompleted: (_identifier: string, _completed: boolean) => Promise<void>;
    deleteReminder: (_identifier: string) => Promise<void>;
}>;
//# sourceMappingURL=unavailable.d.ts.map