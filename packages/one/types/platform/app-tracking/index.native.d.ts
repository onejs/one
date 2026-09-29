import type { AppTrackingPermissionStatus } from '../specs/OneAppTracking.nitro';
export type { AppTrackingPermissionStatus } from '../specs/OneAppTracking.nitro';
declare function getPermissionStatus(): AppTrackingPermissionStatus;
declare function requestPermission(): Promise<AppTrackingPermissionStatus>;
export declare const AppTracking: Readonly<{
    getPermissionStatus: typeof getPermissionStatus;
    requestPermission: typeof requestPermission;
}>;
//# sourceMappingURL=index.native.d.ts.map