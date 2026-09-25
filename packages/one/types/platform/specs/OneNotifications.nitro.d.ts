import type { AnyMap, HybridObject } from 'react-native-nitro-modules';
import type { NotificationBehavior, NotificationPermissionStatus } from '../notifications/types';
export type NativeTriggerType = 'timeInterval' | 'date' | 'push' | 'unknown';
export interface NativeTrigger {
    type: NativeTriggerType;
    seconds?: number;
    repeats?: boolean;
    date?: number;
}
export interface NativeTriggerInput {
    type: string;
    seconds?: number;
    repeats?: boolean;
    date?: number;
    channelId?: string;
}
export interface NativeContent {
    title?: string;
    subtitle?: string;
    body?: string;
    data: AnyMap;
    sound: boolean;
    badge?: number;
}
export interface NativeContentInput {
    title?: string;
    subtitle?: string;
    body?: string;
    data?: AnyMap;
    sound?: boolean;
    badge?: number;
}
export interface NativeScheduleInput {
    identifier?: string;
    content: NativeContentInput;
    trigger?: NativeTriggerInput;
}
export interface NativeNotificationRequest {
    identifier: string;
    content: NativeContent;
    trigger: NativeTrigger;
}
export interface NativeNotification {
    request: NativeNotificationRequest;
    date: number;
}
export interface NativeNotificationResponse {
    notification: NativeNotification;
    actionIdentifier: string;
}
export interface NativeIosPermission {
    status: number;
}
export interface NativePermissionResponse {
    status: NotificationPermissionStatus;
    granted: boolean;
    canAskAgain: boolean;
    ios?: NativeIosPermission;
}
export interface NativeIosPermissionRequest {
    allowAlert?: boolean;
    allowBadge?: boolean;
    allowSound?: boolean;
    allowProvisional?: boolean;
}
export interface NativePermissionRequest {
    ios?: NativeIosPermissionRequest;
}
export interface NativeChannelInput {
    name: string;
    importance: number;
    description?: string;
    sound?: boolean;
    vibrationPattern?: number[];
    showBadge?: boolean;
}
export interface NativeChannel {
    id: string;
    name: string;
    importance: number;
    description?: string;
    sound: boolean;
    vibrationPattern?: number[];
    showBadge: boolean;
}
export interface NativePushToken {
    type: string;
    data: string;
}
export interface OneNotifications extends HybridObject<{
    ios: 'swift';
    android: 'kotlin';
}> {
    getPermissions(): Promise<NativePermissionResponse>;
    requestPermissions(options: NativePermissionRequest): Promise<NativePermissionResponse>;
    getBadgeCount(): Promise<number>;
    setBadgeCount(count: number): Promise<boolean>;
    setNotificationChannel(channelId: string, channel: NativeChannelInput): Promise<NativeChannel | undefined>;
    getNotificationChannel(channelId: string): Promise<NativeChannel | undefined>;
    getNotificationChannels(): Promise<NativeChannel[]>;
    deleteNotificationChannel(channelId: string): Promise<void>;
    scheduleNotification(request: NativeScheduleInput): Promise<string>;
    cancelScheduledNotification(identifier: string): Promise<void>;
    cancelAllScheduledNotifications(): Promise<void>;
    getAllScheduledNotifications(): Promise<NativeNotificationRequest[]>;
    getPresentedNotifications(): Promise<NativeNotification[]>;
    dismissNotification(identifier: string): Promise<void>;
    dismissAllNotifications(): Promise<void>;
    getDevicePushToken(): Promise<NativePushToken>;
    setListeners(onReceived: (requestId: string, notification: NativeNotification) => void, onResponse: (response: NativeNotificationResponse) => void, onPushToken: (token: NativePushToken) => void): void;
    presentNotification(requestId: string, behavior: NotificationBehavior): void;
    getLastNotificationResponse(): NativeNotificationResponse | undefined;
    clearLastNotificationResponse(): void;
}
//# sourceMappingURL=OneNotifications.nitro.d.ts.map