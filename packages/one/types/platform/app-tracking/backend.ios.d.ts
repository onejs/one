import type { AppTrackingPermissionStatus } from '../specs/OneAppTracking.nitro.js';
declare function status(): AppTrackingPermissionStatus;
export declare function appTrackingNative(): {
    getPermissionStatus: typeof status;
    requestPermission(): Promise<AppTrackingPermissionStatus>;
};
export {};
//# sourceMappingURL=backend.ios.d.ts.map