import type { TurboModule } from 'react-native';
import type { Notification, NotificationBehavior, NotificationPermissionRequest, NotificationPermissionStatus, NotificationResponse, NotificationScheduleInput, ScheduledNotification } from '../notifications/types';
export interface NativePushToken {
    type: string;
    data: string;
}
export interface NativePermissionResponse {
    status: NotificationPermissionStatus;
    granted: boolean;
    canAskAgain: boolean;
    ios?: {
        status: number;
    };
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
export interface Spec extends TurboModule {
    getPermissions(): Promise<NativePermissionResponse>;
    requestPermissions(options: NotificationPermissionRequest): Promise<NativePermissionResponse>;
    getBadgeCount(): Promise<number>;
    setBadgeCount(count: number): Promise<boolean>;
    setNotificationChannel(channelId: string, channel: NativeChannelInput): Promise<NativeChannel | null>;
    getNotificationChannel(channelId: string): Promise<NativeChannel | null>;
    getNotificationChannels(): Promise<NativeChannel[]>;
    deleteNotificationChannel(channelId: string): Promise<void>;
    scheduleNotification(request: NotificationScheduleInput): Promise<string>;
    cancelScheduledNotification(identifier: string): Promise<void>;
    cancelAllScheduledNotifications(): Promise<void>;
    getAllScheduledNotifications(): Promise<ScheduledNotification[]>;
    getPresentedNotifications(): Promise<Notification[]>;
    dismissNotification(identifier: string): Promise<void>;
    dismissAllNotifications(): Promise<void>;
    presentNotification(requestId: string, behavior: NotificationBehavior): Promise<void>;
    getDevicePushToken(): Promise<NativePushToken>;
    getLastNotificationResponse(): NotificationResponse | null;
    clearLastNotificationResponse(): void;
    addListener(eventName: string): void;
    removeListeners(count: number): void;
}
//# sourceMappingURL=OneNativeNotificationsNativeModule.d.ts.map