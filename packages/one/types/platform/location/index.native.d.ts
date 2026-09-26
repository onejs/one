import type { LocationPermissionStatus, LocationPosition } from '../specs/OneLocation.nitro';
export type { LocationPermissionStatus, LocationPosition };
declare function getPermissionStatus(): LocationPermissionStatus;
declare function requestWhenInUsePermission(): Promise<LocationPermissionStatus>;
declare function getCurrentPosition(): Promise<LocationPosition>;
export declare const Location: Readonly<{
    getPermissionStatus: typeof getPermissionStatus;
    requestWhenInUsePermission: typeof requestWhenInUsePermission;
    getCurrentPosition: typeof getCurrentPosition;
}>;
//# sourceMappingURL=index.native.d.ts.map