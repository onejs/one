import type { Notification, NotificationChannel, NotificationChannelInput, NotificationHandlerInput, NotificationPermissionRequest, NotificationPermissionResponse, NotificationResponse, NotificationScheduleInput, NotificationSubscription } from './types';
export type * from './types';
export { AndroidImportance, DEFAULT_ACTION_IDENTIFIER } from './types';
export declare function getPermissionsAsync(): Promise<NotificationPermissionResponse>;
export declare function requestPermissionsAsync(_options?: NotificationPermissionRequest): Promise<NotificationPermissionResponse>;
export declare function getBadgeCountAsync(): Promise<number>;
export declare function setBadgeCountAsync(_count: number): Promise<boolean>;
export declare function setNotificationChannelAsync(_channelId: string, _channel: NotificationChannelInput): Promise<NotificationChannel | null>;
export declare function getNotificationChannelAsync(_channelId: string): Promise<NotificationChannel | null>;
export declare function getNotificationChannelsAsync(): Promise<NotificationChannel[]>;
export declare function deleteNotificationChannelAsync(_channelId: string): Promise<void>;
export declare function addNotificationReceivedListener(_listener: (notification: Notification) => void): NotificationSubscription;
export declare function addNotificationResponseReceivedListener(_listener: (response: NotificationResponse) => void): NotificationSubscription;
export declare function setNotificationHandler(_handler: NotificationHandlerInput | null): void;
export declare function getLastNotificationResponse(): NotificationResponse | null;
export declare function clearLastNotificationResponse(): void;
export declare function scheduleNotificationAsync(_request: NotificationScheduleInput): Promise<string>;
//# sourceMappingURL=index.d.ts.map