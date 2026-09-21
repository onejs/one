import type { TurboModule } from 'react-native';
import type { NotificationPermissionRequest, NotificationPermissionResponse } from '../notifications/types';
export interface Spec extends TurboModule {
    getPermissions(): Promise<NotificationPermissionResponse>;
    requestPermissions(options: NotificationPermissionRequest): Promise<NotificationPermissionResponse>;
    getBadgeCount(): Promise<number>;
    setBadgeCount(count: number): Promise<boolean>;
}
//# sourceMappingURL=OneNativeNotificationsNativeModule.d.ts.map