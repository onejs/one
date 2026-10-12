import type { HybridObject } from 'react-native-nitro-modules';
import type { BatteryLevelEvent, BatteryPowerModeEvent, BatteryPowerState, BatteryState, BatteryStateEvent } from '../battery/types';
export interface OneBattery extends HybridObject<{
    ios: 'swift';
    android: 'kotlin';
}> {
    getLevel(): Promise<number>;
    getState(): Promise<BatteryState>;
    getPowerState(): Promise<BatteryPowerState>;
    isLowPowerModeEnabled(): Promise<boolean>;
    isAvailable(): boolean;
    addLevelListener(listener: (event: BatteryLevelEvent) => void): () => void;
    addStateListener(listener: (event: BatteryStateEvent) => void): () => void;
    addLowPowerModeListener(listener: (event: BatteryPowerModeEvent) => void): () => void;
}
//# sourceMappingURL=OneBattery.nitro.d.ts.map