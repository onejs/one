import type { TurboModule } from 'react-native';
import type { NotificationBehavior, NotificationChannel, NotificationChannelInput, NotificationPermissionRequest, NotificationPermissionResponse, NotificationResponse, NotificationScheduleInput } from '../notifications/types';
export interface Spec extends TurboModule {
    getPermissions(): Promise<NotificationPermissionResponse>;
    requestPermissions(options: NotificationPermissionRequest): Promise<NotificationPermissionResponse>;
    getBadgeCount(): Promise<number>;
    setBadgeCount(count: number): Promise<boolean>;
    setNotificationChannel(channelId: string, channel: NotificationChannelInput): Promise<NotificationChannel | null>;
    getNotificationChannel(channelId: string): Promise<NotificationChannel | null>;
    getNotificationChannels(): Promise<NotificationChannel[]>;
    deleteNotificationChannel(channelId: string): Promise<void>;
    scheduleNotification(request: NotificationScheduleInput): Promise<string>;
    presentNotification(requestId: string, behavior: NotificationBehavior): Promise<void>;
    getLastNotificationResponse(): NotificationResponse | null;
    clearLastNotificationResponse(): void;
    addListener(eventName: string): void;
    removeListeners(count: number): void;
}
//# sourceMappingURL=OneNativeNotificationsNativeModule.d.ts.map