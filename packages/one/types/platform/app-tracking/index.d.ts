import type { AppTrackingPermissionStatus } from '../specs/OneAppTracking.nitro';
export type { AppTrackingPermissionStatus } from '../specs/OneAppTracking.nitro';
export declare const AppTracking: Readonly<{
    getPermissionStatus: () => AppTrackingPermissionStatus;
    requestPermission: () => Promise<AppTrackingPermissionStatus>;
}>;
//# sourceMappingURL=index.d.ts.map