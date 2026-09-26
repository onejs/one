import type { LocationPermissionStatus, LocationPosition, LocationPlace } from '../specs/OneLocation.nitro';
export type { LocationPermissionStatus, LocationPosition, LocationPlace };
declare function getPermissionStatus(): LocationPermissionStatus;
declare function requestWhenInUsePermission(): Promise<LocationPermissionStatus>;
declare function getCurrentPosition(): Promise<LocationPosition>;
export type LocationWatchError = Error & {
    code: string;
};
declare function watchPosition(onPosition: (position: LocationPosition) => void, onError: (error: LocationWatchError) => void): () => void;
declare function geocodeAddress(address: string): Promise<LocationPlace[]>;
declare function reverseGeocode(latitude: number, longitude: number): Promise<LocationPlace[]>;
export declare const Location: Readonly<{
    getPermissionStatus: typeof getPermissionStatus;
    requestWhenInUsePermission: typeof requestWhenInUsePermission;
    getCurrentPosition: typeof getCurrentPosition;
    watchPosition: typeof watchPosition;
    geocodeAddress: typeof geocodeAddress;
    reverseGeocode: typeof reverseGeocode;
}>;
//# sourceMappingURL=index.native.d.ts.map