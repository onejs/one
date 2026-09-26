import type { LocationPermissionStatus, LocationPosition, LocationPlace } from '../specs/OneLocation.nitro';
export type { LocationPermissionStatus, LocationPosition, LocationPlace };
export type LocationWatchError = Error & {
    code: string;
};
export declare const Location: Readonly<{
    getPermissionStatus: () => LocationPermissionStatus;
    requestWhenInUsePermission: () => Promise<LocationPermissionStatus>;
    getCurrentPosition: () => Promise<LocationPosition>;
    watchPosition: (_onPosition: (position: LocationPosition) => void, _onError: (error: LocationWatchError) => void) => (() => void);
    geocodeAddress: (_address: string) => Promise<LocationPlace[]>;
    reverseGeocode: (_latitude: number, _longitude: number) => Promise<LocationPlace[]>;
}>;
//# sourceMappingURL=index.d.ts.map