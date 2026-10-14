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
export interface LocaleInfo {
    languageTag: string;
    languageCode?: string;
    languageScriptCode?: string;
    regionCode?: string;
    languageRegionCode?: string;
    currencyCode?: string;
    currencySymbol?: string;
    languageCurrencyCode?: string;
    languageCurrencySymbol?: string;
    decimalSeparator?: string;
    digitGroupingSeparator?: string;
    textDirection: string;
    measurementSystem?: string;
    temperatureUnit?: string;
}
export interface CalendarInfo {
    calendar?: string;
    timeZone?: string;
    uses24hourClock?: boolean;
    firstWeekday?: number;
}
export interface OneDevice extends HybridObject<{
    ios: 'swift';
    android: 'kotlin';
}> {
    getInfo(): Promise<DeviceInfo>;
    getLocalizationInfo(): Promise<LocalizationInfo>;
    getLocales(): LocaleInfo[];
    getCalendars(): CalendarInfo[];
    addLocalizationListener(listener: () => void): () => void;
}
//# sourceMappingURL=OneDevice.nitro.d.ts.map