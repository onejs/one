export type * from './index.native';
export declare const Calendar: Readonly<{
    getPermissionStatus: () => import("./unavailable").CalendarPermissionStatus;
    requestPermission: () => Promise<import("./unavailable").CalendarPermissionStatus>;
    list: (startMs: number, endMs: number, limit?: number) => Promise<import("./unavailable").CalendarEvent[]>;
    create: (input: import("./index.native").CalendarEventInput) => Promise<string>;
    update: (identifier: string, originalStartMs: number, changes: import("./unavailable").CalendarEventChanges) => Promise<import("./unavailable").CalendarEvent>;
    delete: (identifier: string, startMs: number) => Promise<void>;
    getRemindersPermissionStatus: () => import("./unavailable").CalendarPermissionStatus;
    requestRemindersPermission: () => Promise<import("./unavailable").CalendarPermissionStatus>;
    listReminders: (_limit?: number, _includeCompleted?: boolean) => Promise<import("./unavailable").ReminderInfo[]>;
    createReminder: (_input: import("./unavailable").ReminderInput) => Promise<string>;
    setReminderCompleted: (_identifier: string, _completed: boolean) => Promise<void>;
    deleteReminder: (_identifier: string) => Promise<void>;
}>;
//# sourceMappingURL=index.android.d.ts.map