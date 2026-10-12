import type { HybridObject } from 'react-native-nitro-modules';
export interface DeviceInfo {
    model: string;
    systemName: string;
    systemVersion: string;
    interfaceIdiom: string;
    isSimulator: boolean;
    vendorIdentifier?: string;
}
export interface LocalizationInfo {
    localeIdentifier: string;
    preferredLanguages: string[];
    calendarIdentifier: string;
    timeZoneIdentifier: string;
    timeZoneOffsetSeconds: number;
    currencyCode?: string;
}
export interface OneDevice extends HybridObject<{
    ios: 'swift';
    android: 'kotlin';
}> {
    getInfo(): Promise<DeviceInfo>;
    getLocalizationInfo(): Promise<LocalizationInfo>;
}
//# sourceMappingURL=OneDevice.nitro.d.ts.map