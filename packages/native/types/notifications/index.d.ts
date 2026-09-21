import type { NotificationChannel, NotificationChannelInput, NotificationPermissionRequest, NotificationPermissionResponse } from './types';
export type * from './types';
export { AndroidImportance } from './types';
export declare function getPermissionsAsync(): Promise<NotificationPermissionResponse>;
export declare function requestPermissionsAsync(_options?: NotificationPermissionRequest): Promise<NotificationPermissionResponse>;
export declare function getBadgeCountAsync(): Promise<number>;
export declare function setBadgeCountAsync(_count: number): Promise<boolean>;
export declare function setNotificationChannelAsync(_channelId: string, _channel: NotificationChannelInput): Promise<NotificationChannel | null>;
export declare function getNotificationChannelAsync(_channelId: string): Promise<NotificationChannel | null>;
export declare function getNotificationChannelsAsync(): Promise<NotificationChannel[]>;
export declare function deleteNotificationChannelAsync(_channelId: string): Promise<void>;
//# sourceMappingURL=index.d.ts.map