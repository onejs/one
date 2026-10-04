import type { LocationPermissionStatus, LocationPosition, LocationPlace } from '../specs/OneLocation.nitro';
export type { LocationPermissionStatus, LocationPosition, LocationPlace };
export type LocationWatchError = Error & {
    code: string;
};
declare function current(): Promise<LocationPosition>;
export declare const Location: Readonly<{
    getPermissionStatus: () => LocationPermissionStatus;
    requestWhenInUsePermission: () => Promise<LocationPermissionStatus>;
    getCurrentPosition: typeof current;
    watchPosition: (onPosition: (value: LocationPosition) => void, onError: (error: LocationWatchError) => void, options?: {
        background?: boolean;
    }) => (() => void);
    geocodeAddress: (_address: string) => Promise<LocationPlace[]>;
    reverseGeocode: (_latitude: number, _longitude: number) => Promise<LocationPlace[]>;
}>;
//# sourceMappingURL=index.d.ts.map