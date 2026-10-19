import type { CalendarInfo, DeviceInfo, LocalizationInfo, LocaleInfo } from '../specs/OneDevice.nitro';
declare function getLocales(): LocaleInfo[];
declare function getCalendars(): CalendarInfo[];
declare function addLocalizationListener(listener: () => void): () => void;
declare function getInfo(): Promise<DeviceInfo>;
declare function getLocalizationInfo(): Promise<LocalizationInfo>;
export declare function deviceNative(): {
    getInfo: typeof getInfo;
    getLocalizationInfo: typeof getLocalizationInfo;
    getLocales: typeof getLocales;
    getCalendars: typeof getCalendars;
    addLocalizationListener: typeof addLocalizationListener;
};
export {};
//# sourceMappingURL=backend.ios.d.ts.map