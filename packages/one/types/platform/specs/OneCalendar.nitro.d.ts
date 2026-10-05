import type { HybridObject } from 'react-native-nitro-modules';
export type CalendarPermissionStatus = 'notDetermined' | 'restricted' | 'denied' | 'writeOnly' | 'fullAccess';
export interface CalendarEventInput {
    title: string;
    startMs: number;
    endMs: number;
    allDay: boolean;
    recurrence?: CalendarRecurrence;
}
export type CalendarRecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';
export interface CalendarRecurrence {
    frequency: CalendarRecurrenceFrequency;
    interval?: number;
    endDateMs?: number;
    occurrenceCount?: number;
}
export interface CalendarEvent {
    identifier: string;
    title: string;
    startMs: number;
    endMs: number;
    allDay: boolean;
    location: string;
    recurrence?: CalendarRecurrence;
}
export interface CalendarEventChanges {
    title?: string;
    startMs?: number;
    endMs?: number;
    allDay?: boolean;
    location?: string;
}
export interface ReminderInput {
    title: string;
    dueMs?: number;
    recurrence?: CalendarRecurrence;
}
export interface ReminderInfo {
    identifier: string;
    title: string;
    completed: boolean;
    dueMs?: number;
    recurrence?: CalendarRecurrence;
}
export interface OneCalendar extends HybridObject<{
    ios: 'swift';
    android: 'kotlin';
}> {
    getPermissionStatus(): CalendarPermissionStatus;
    requestPermission(): Promise<CalendarPermissionStatus>;
    list(startMs: number, endMs: number, limit: number): Promise<CalendarEvent[]>;
    create(input: CalendarEventInput): Promise<string>;
    update(identifier: string, originalStartMs: number, changes: CalendarEventChanges): Promise<CalendarEvent>;
    remove(identifier: string, startMs: number): Promise<void>;
    getRemindersPermissionStatus(): CalendarPermissionStatus;
    requestRemindersPermission(): Promise<CalendarPermissionStatus>;
    listReminders(limit: number, includeCompleted: boolean): Promise<ReminderInfo[]>;
    createReminder(input: ReminderInput): Promise<string>;
    setReminderCompleted(identifier: string, completed: boolean): Promise<void>;
    removeReminder(identifier: string): Promise<void>;
}
//# sourceMappingURL=OneCalendar.nitro.d.ts.map