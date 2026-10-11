import type { HybridObject } from 'react-native-nitro-modules';
import type { BrightnessEvent, BrightnessMode, BrightnessPermissionResponse } from '../brightness/types';
export interface OneBrightness extends HybridObject<{
    ios: 'swift';
    android: 'kotlin';
}> {
    get(): Promise<number>;
    set(value: number): Promise<void>;
    getSystem(): Promise<number>;
    setSystem(value: number): Promise<void>;
    getSystemMode(): Promise<BrightnessMode>;
    setSystemMode(mode: BrightnessMode): Promise<void>;
    isUsingSystem(): Promise<boolean>;
    restoreSystem(): Promise<void>;
    getPermissions(): Promise<BrightnessPermissionResponse>;
    requestPermissions(): Promise<BrightnessPermissionResponse>;
    isAvailable(): boolean;
    addListener(listener: (event: BrightnessEvent) => void): () => void;
}
//# sourceMappingURL=OneBrightness.nitro.d.ts.map