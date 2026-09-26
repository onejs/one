import type { HybridObject } from 'react-native-nitro-modules';
export type LocationPermissionStatus = 'notDetermined' | 'restricted' | 'denied' | 'whenInUse' | 'always';
export interface LocationPosition {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude: number;
    altitudeAccuracy: number;
    course: number;
    speed: number;
    timestamp: number;
}
export interface OneLocation extends HybridObject<{
    ios: 'swift';
}> {
    getPermissionStatus(): LocationPermissionStatus;
    requestWhenInUsePermission(): Promise<LocationPermissionStatus>;
    getCurrentPosition(): Promise<LocationPosition>;
}
//# sourceMappingURL=OneLocation.nitro.d.ts.map