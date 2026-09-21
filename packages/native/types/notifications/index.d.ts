import type { NotificationPermissionRequest, NotificationPermissionResponse } from './types';
export type * from './types';
export declare function getPermissionsAsync(): Promise<NotificationPermissionResponse>;
export declare function requestPermissionsAsync(_options?: NotificationPermissionRequest): Promise<NotificationPermissionResponse>;
export declare function getBadgeCountAsync(): Promise<number>;
export declare function setBadgeCountAsync(_count: number): Promise<boolean>;
//# sourceMappingURL=index.d.ts.map