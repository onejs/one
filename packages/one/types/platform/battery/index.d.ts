import type { BatteryPowerState, BatteryState, BatterySubscription } from './types';
export type { BatteryLevelEvent, BatteryPowerModeEvent, BatteryPowerState, BatteryState, BatteryStateEvent, BatterySubscription, } from './types';
declare function getLevel(): Promise<number>;
declare function getState(): Promise<BatteryState>;
declare function getPowerState(): Promise<BatteryPowerState>;
declare function isLowPowerModeEnabled(): Promise<boolean>;
declare function isAvailable(): boolean;
declare function addLevelListener(listener: (event: {
    batteryLevel: number;
}) => void): BatterySubscription;
declare function addStateListener(listener: (event: {
    batteryState: BatteryState;
}) => void): BatterySubscription;
declare function addLowPowerModeListener(listener: (event: {
    lowPowerMode: boolean;
}) => void): BatterySubscription;
declare function useBatteryLevel(): number;
declare function useBatteryState(): BatteryState;
declare function useLowPowerMode(): boolean;
declare function usePowerState(): BatteryPowerState;
export declare const Battery: Readonly<{
    getLevel: typeof getLevel;
    getState: typeof getState;
    getPowerState: typeof getPowerState;
    isLowPowerModeEnabled: typeof isLowPowerModeEnabled;
    isAvailable: typeof isAvailable;
    addLevelListener: typeof addLevelListener;
    addStateListener: typeof addStateListener;
    addLowPowerModeListener: typeof addLowPowerModeListener;
}>;
export { useBatteryLevel, useBatteryState, useLowPowerMode, usePowerState };
//# sourceMappingURL=index.d.ts.map