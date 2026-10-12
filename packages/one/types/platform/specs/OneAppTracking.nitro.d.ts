import type { HybridObject } from 'react-native-nitro-modules';
export type AppTrackingPermissionStatus = 'notDetermined' | 'restricted' | 'denied' | 'authorized';
export interface OneAppTracking extends HybridObject<{
    ios: 'swift';
}> {
    getPermissionStatus(): AppTrackingPermissionStatus;
    requestPermission(): Promise<AppTrackingPermissionStatus>;
}
//# sourceMappingURL=OneAppTracking.nitro.d.ts.map