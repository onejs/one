import type { LocationPermissionStatus, LocationPosition, LocationPlace, LocationRegion, RegionCenter, RegionState } from '../specs/OneLocation.nitro';
export type { LocationPermissionStatus, LocationPosition, LocationPlace, LocationRegion, RegionCenter, RegionState, };
export type LocationWatchError = Error & {
    code: string;
};
export interface RegionSubscription {
    remove(): void;
}
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
    requestAlwaysAuthorization: () => Promise<LocationPermissionStatus>;
    startMonitoring: (region: LocationRegion) => Promise<void>;
    stopMonitoring: (identifier: string) => Promise<void>;
    monitoredRegions: () => LocationRegion[];
    requestState: (identifier: string) => Promise<RegionState>;
    addDidEnterRegionListener: (listener: (region: LocationRegion) => void) => RegionSubscription;
    addDidExitRegionListener: (listener: (region: LocationRegion) => void) => RegionSubscription;
}>;
//# sourceMappingURL=index.d.ts.map