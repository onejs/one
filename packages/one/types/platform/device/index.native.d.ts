import type { DeviceInfo, LocalizationInfo } from '../specs/OneDevice.nitro';
export type { DeviceInfo, LocalizationInfo };
declare function getInfo(): Promise<DeviceInfo>;
declare function getLocalizationInfo(): Promise<LocalizationInfo>;
export declare const Device: Readonly<{
    getInfo: typeof getInfo;
    getLocalizationInfo: typeof getLocalizationInfo;
}>;
//# sourceMappingURL=index.native.d.ts.map