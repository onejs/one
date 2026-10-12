import type { LocationPermissionStatus, LocationPosition, LocationPlace, LocationRegion, RegionCenter, RegionState } from '../specs/OneLocation.nitro';
export type { LocationPermissionStatus, LocationPosition, LocationPlace, LocationRegion, RegionCenter, RegionState, };
declare function getPermissionStatus(): LocationPermissionStatus;
declare function requestWhenInUsePermission(): Promise<LocationPermissionStatus>;
declare function requestAlwaysAuthorization(): Promise<LocationPermissionStatus>;
declare function getCurrentPosition(): Promise<LocationPosition>;
export type LocationWatchError = Error & {
    code: string;
};
declare function watchPosition(onPosition: (position: LocationPosition) => void, onError: (error: LocationWatchError) => void, options?: {
    background?: boolean;
}): () => void;
declare function geocodeAddress(address: string): Promise<LocationPlace[]>;
declare function reverseGeocode(latitude: number, longitude: number): Promise<LocationPlace[]>;
export interface RegionSubscription {
    remove(): void;
}
declare function startMonitoring(region: LocationRegion): Promise<void>;
declare function stopMonitoring(identifier: string): Promise<void>;
declare function monitoredRegions(): LocationRegion[];
declare function requestState(identifier: string): Promise<RegionState>;
declare function addDidEnterRegionListener(listener: (region: LocationRegion) => void): RegionSubscription;
declare function addDidExitRegionListener(listener: (region: LocationRegion) => void): RegionSubscription;
export declare const Location: Readonly<{
    getPermissionStatus: typeof getPermissionStatus;
    requestWhenInUsePermission: typeof requestWhenInUsePermission;
    requestAlwaysAuthorization: typeof requestAlwaysAuthorization;
    getCurrentPosition: typeof getCurrentPosition;
    watchPosition: typeof watchPosition;
    geocodeAddress: typeof geocodeAddress;
    reverseGeocode: typeof reverseGeocode;
    startMonitoring: typeof startMonitoring;
    stopMonitoring: typeof stopMonitoring;
    monitoredRegions: typeof monitoredRegions;
    requestState: typeof requestState;
    addDidEnterRegionListener: typeof addDidEnterRegionListener;
    addDidExitRegionListener: typeof addDidExitRegionListener;
}>;
//# sourceMappingURL=index.native.d.ts.map