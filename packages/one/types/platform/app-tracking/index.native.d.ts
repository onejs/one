import type { AppTrackingPermissionStatus } from '../specs/OneAppTracking.nitro';
export type { AppTrackingPermissionStatus } from '../specs/OneAppTracking.nitro';
declare function getPermissionStatus(): AppTrackingPermissionStatus;
declare function requestPermission(): Promise<AppTrackingPermissionStatus>;
declare const nativeAppTracking: Readonly<{
    getPermissionStatus: typeof getPermissionStatus;
    requestPermission: typeof requestPermission;
}>;
export declare const AppTracking: typeof nativeAppTracking;
//# sourceMappingURL=index.native.d.ts.map