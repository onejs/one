import type { LocationPermissionStatus, LocationPosition } from '../specs/OneLocation.nitro';
export type { LocationPermissionStatus, LocationPosition };
export declare const Location: Readonly<{
    getPermissionStatus: () => LocationPermissionStatus;
    requestWhenInUsePermission: () => Promise<LocationPermissionStatus>;
    getCurrentPosition: () => Promise<LocationPosition>;
}>;
//# sourceMappingURL=index.d.ts.map