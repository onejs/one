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
export interface LocationPlace {
    latitude: number;
    longitude: number;
    name?: string;
    street?: string;
    houseNumber?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
    isoCountryCode?: string;
}
export interface OneLocation extends HybridObject<{
    ios: 'swift';
    android: 'kotlin';
}> {
    getPermissionStatus(): LocationPermissionStatus;
    requestWhenInUsePermission(): Promise<LocationPermissionStatus>;
    getCurrentPosition(): Promise<LocationPosition>;
    addPositionListener(onPosition: (position: LocationPosition) => void, onError: (code: string, message: string) => void, background: boolean): () => void;
    geocodeAddress(address: string): Promise<LocationPlace[]>;
    reverseGeocode(latitude: number, longitude: number): Promise<LocationPlace[]>;
}
//# sourceMappingURL=OneLocation.nitro.d.ts.map