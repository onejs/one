import type { NotificationPermissionRequest, NotificationPermissionResponse } from './types';
export type * from './types';
export declare function getPermissionsAsync(): Promise<NotificationPermissionResponse>;
export declare function requestPermissionsAsync(options?: NotificationPermissionRequest): Promise<NotificationPermissionResponse>;
export declare function getBadgeCountAsync(): Promise<number>;
export declare function setBadgeCountAsync(count: number): Promise<boolean>;
//# sourceMappingURL=index.native.d.ts.map