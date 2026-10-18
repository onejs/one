import type { BrightnessEvent, BrightnessMode, BrightnessPermissionResponse } from './types';
declare function addListener(listener: (event: BrightnessEvent) => void): () => void;
export declare function brightnessNative(): {
    get(): Promise<number>;
    set(value: number): Promise<void>;
    getSystem(): Promise<number>;
    setSystem(_value: number): Promise<void>;
    getSystemMode(): Promise<BrightnessMode>;
    setSystemMode(_mode: BrightnessMode): Promise<void>;
    isUsingSystem(): Promise<boolean>;
    restoreSystem(): Promise<void>;
    getPermissions(): Promise<BrightnessPermissionResponse>;
    requestPermissions(): Promise<BrightnessPermissionResponse>;
    isAvailable(): boolean;
    addListener: typeof addListener;
};
export {};
//# sourceMappingURL=backend.ios.d.ts.map