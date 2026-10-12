import type { LocationPermissionStatus, LocationPosition, LocationPlace, LocationRegion, RegionCenter, RegionState } from '../specs/OneLocation.nitro';
export type { LocationPermissionStatus, LocationPosition, LocationPlace, LocationRegion, RegionCenter, RegionState, };
export type LocationWatchError = Error & {
    code: string;
};
export interface RegionSubscription {
    remove(): void;
}
export declare const Location: Readonly<{
    getPermissionStatus: () => LocationPermissionStatus;
    requestWhenInUsePermission: () => Promise<LocationPermissionStatus>;
    requestAlwaysAuthorization: () => Promise<LocationPermissionStatus>;
    getCurrentPosition: () => Promise<LocationPosition>;
    watchPosition: (_onPosition: (position: LocationPosition) => void, _onError: (error: LocationWatchError) => void, _options?: {
        background?: boolean;
    }) => (() => void);
    geocodeAddress: (_address: string) => Promise<LocationPlace[]>;
    reverseGeocode: (_latitude: number, _longitude: number) => Promise<LocationPlace[]>;
    startMonitoring: (region: LocationRegion) => Promise<void>;
    stopMonitoring: (identifier: string) => Promise<void>;
    monitoredRegions: () => LocationRegion[];
    requestState: (identifier: string) => Promise<RegionState>;
    addDidEnterRegionListener: (listener: (region: LocationRegion) => void) => RegionSubscription;
    addDidExitRegionListener: (listener: (region: LocationRegion) => void) => RegionSubscription;
}>;
//# sourceMappingURL=unavailable.d.ts.map