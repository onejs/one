import type { Notification, NotificationChannel, NotificationChannelInput, NotificationHandlerInput, NotificationPermissionRequest, NotificationPermissionResponse, NotificationResponse, NotificationScheduleInput, NotificationSubscription } from './types';
export type * from './types';
export { AndroidImportance, DEFAULT_ACTION_IDENTIFIER } from './types';
export declare function getPermissionsAsync(): Promise<NotificationPermissionResponse>;
export declare function requestPermissionsAsync(options?: NotificationPermissionRequest): Promise<NotificationPermissionResponse>;
export declare function getBadgeCountAsync(): Promise<number>;
export declare function setBadgeCountAsync(count: number): Promise<boolean>;
export declare function setNotificationChannelAsync(channelId: string, channel: NotificationChannelInput): Promise<NotificationChannel | null>;
export declare function getNotificationChannelAsync(channelId: string): Promise<NotificationChannel | null>;
export declare function getNotificationChannelsAsync(): Promise<NotificationChannel[]>;
export declare function deleteNotificationChannelAsync(channelId: string): Promise<void>;
export declare function addNotificationReceivedListener(listener: (notification: Notification) => void): NotificationSubscription;
export declare function addNotificationResponseReceivedListener(listener: (response: NotificationResponse) => void): NotificationSubscription;
export declare function setNotificationHandler(handler: NotificationHandlerInput | null): void;
export declare function getLastNotificationResponse(): NotificationResponse | null;
export declare function clearLastNotificationResponse(): void;
export declare function scheduleNotificationAsync(request: NotificationScheduleInput): Promise<string>;
//# sourceMappingURL=index.native.d.ts.map