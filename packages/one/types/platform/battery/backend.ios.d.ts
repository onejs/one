import type { BatteryLevelEvent, BatteryPowerModeEvent, BatteryPowerState, BatteryState, BatteryStateEvent } from './types';
declare function getLevel(): Promise<number>;
declare function getState(): Promise<BatteryState>;
declare function getPowerState(): Promise<BatteryPowerState>;
declare function isLowPowerModeEnabled(): Promise<boolean>;
declare function isAvailable(): boolean;
declare function addLevelListener(listener: (event: BatteryLevelEvent) => void): () => void;
declare function addStateListener(listener: (event: BatteryStateEvent) => void): () => void;
declare function addLowPowerModeListener(listener: (event: BatteryPowerModeEvent) => void): () => void;
export declare function batteryNative(): {
    getLevel: typeof getLevel;
    getState: typeof getState;
    getPowerState: typeof getPowerState;
    isLowPowerModeEnabled: typeof isLowPowerModeEnabled;
    isAvailable: typeof isAvailable;
    addLevelListener: typeof addLevelListener;
    addStateListener: typeof addStateListener;
    addLowPowerModeListener: typeof addLowPowerModeListener;
};
export {};
//# sourceMappingURL=backend.ios.d.ts.map