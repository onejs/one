import type { HybridObject } from 'react-native-nitro-modules';
export type CalendarPermissionStatus = 'notDetermined' | 'restricted' | 'denied' | 'writeOnly' | 'fullAccess';
export interface CalendarEventInput {
    title: string;
    startMs: number;
    endMs: number;
    allDay: boolean;
}
export interface CalendarEvent {
    identifier: string;
    title: string;
    startMs: number;
    endMs: number;
    allDay: boolean;
    location: string;
}
export interface ReminderInput {
    title: string;
    dueMs?: number;
}
export interface ReminderInfo {
    identifier: string;
    title: string;
    completed: boolean;
    dueMs?: number;
}
export interface OneCalendar extends HybridObject<{
    ios: 'swift';
}> {
    getPermissionStatus(): CalendarPermissionStatus;
    requestPermission(): Promise<CalendarPermissionStatus>;
    list(startMs: number, endMs: number, limit: number): Promise<CalendarEvent[]>;
    create(input: CalendarEventInput): Promise<string>;
    remove(identifier: string, startMs: number): Promise<void>;
    getRemindersPermissionStatus(): CalendarPermissionStatus;
    requestRemindersPermission(): Promise<CalendarPermissionStatus>;
    listReminders(limit: number, includeCompleted: boolean): Promise<ReminderInfo[]>;
    createReminder(input: ReminderInput): Promise<string>;
    setReminderCompleted(identifier: string, completed: boolean): Promise<void>;
    removeReminder(identifier: string): Promise<void>;
}
//# sourceMappingURL=OneCalendar.nitro.d.ts.map