import type { CalendarEvent, CalendarEventChanges, CalendarEventInput, CalendarPermissionStatus, ReminderInfo, ReminderInput } from '../specs/OneCalendar.nitro';
declare function getPermissionStatus(): CalendarPermissionStatus;
declare function getRemindersPermissionStatus(): CalendarPermissionStatus;
declare function list(startMs: number, endMs: number, limit: number): Promise<CalendarEvent[]>;
declare function create(input: CalendarEventInput): Promise<string>;
declare function update(identifier: string, originalStartMs: number, changes: CalendarEventChanges): Promise<CalendarEvent>;
declare function remove(identifier: string, startMs: number): Promise<void>;
declare function listReminders(limit: number, includeCompleted: boolean): Promise<ReminderInfo[]>;
declare function createReminder(input: ReminderInput): Promise<string>;
declare function setReminderCompleted(identifier: string, completed: boolean): Promise<void>;
declare function removeReminder(identifier: string): Promise<void>;
export declare function calendarNative(): {
    getPermissionStatus: typeof getPermissionStatus;
    requestPermission: () => Promise<CalendarPermissionStatus>;
    list: typeof list;
    create: typeof create;
    update: typeof update;
    remove: typeof remove;
    getRemindersPermissionStatus: typeof getRemindersPermissionStatus;
    requestRemindersPermission: () => Promise<CalendarPermissionStatus>;
    listReminders: typeof listReminders;
    createReminder: typeof createReminder;
    setReminderCompleted: typeof setReminderCompleted;
    removeReminder: typeof removeReminder;
};
export {};
//# sourceMappingURL=backend.ios.d.ts.map