import type { BrightnessMode, BrightnessPermissionResponse, BrightnessSubscription } from './types';
export type { BrightnessEvent, BrightnessMode, BrightnessPermissionResponse, BrightnessPermissionStatus, BrightnessSubscription, } from './types';
declare function get(): Promise<number>;
declare function set(value: number): Promise<void>;
declare function getSystem(): Promise<number>;
declare function setSystem(value: number): Promise<void>;
declare function getSystemMode(): Promise<BrightnessMode>;
declare function setSystemMode(mode: BrightnessMode): Promise<void>;
declare function isUsingSystem(): Promise<boolean>;
declare function restoreSystem(): Promise<void>;
declare function getPermissions(): Promise<BrightnessPermissionResponse>;
declare function requestPermissions(): Promise<BrightnessPermissionResponse>;
declare function isAvailable(): boolean;
declare function addListener(listener: (event: {
    brightness: number;
}) => void): BrightnessSubscription;
export declare const Brightness: Readonly<{
    get: typeof get;
    set: typeof set;
    getSystem: typeof getSystem;
    setSystem: typeof setSystem;
    getSystemMode: typeof getSystemMode;
    setSystemMode: typeof setSystemMode;
    isUsingSystem: typeof isUsingSystem;
    restoreSystem: typeof restoreSystem;
    getPermissions: typeof getPermissions;
    requestPermissions: typeof requestPermissions;
    isAvailable: typeof isAvailable;
    addListener: typeof addListener;
}>;
//# sourceMappingURL=index.d.ts.map