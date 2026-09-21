import type { NotificationChannel, NotificationChannelInput, NotificationPermissionRequest, NotificationPermissionResponse } from './types';
export type * from './types';
export { AndroidImportance } from './types';
export declare function getPermissionsAsync(): Promise<NotificationPermissionResponse>;
export declare function requestPermissionsAsync(options?: NotificationPermissionRequest): Promise<NotificationPermissionResponse>;
export declare function getBadgeCountAsync(): Promise<number>;
export declare function setBadgeCountAsync(count: number): Promise<boolean>;
export declare function setNotificationChannelAsync(channelId: string, channel: NotificationChannelInput): Promise<NotificationChannel | null>;
export declare function getNotificationChannelAsync(channelId: string): Promise<NotificationChannel | null>;
export declare function getNotificationChannelsAsync(): Promise<NotificationChannel[]>;
export declare function deleteNotificationChannelAsync(channelId: string): Promise<void>;
//# sourceMappingURL=index.native.d.ts.map