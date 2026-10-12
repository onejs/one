import type { BatteryLevelEvent, BatteryPowerModeEvent, BatteryStateEvent } from './types';
export declare function assertLevelListener(listener: unknown): asserts listener is (event: BatteryLevelEvent) => void;
export declare function assertStateListener(listener: unknown): asserts listener is (event: BatteryStateEvent) => void;
export declare function assertLowPowerModeListener(listener: unknown): asserts listener is (event: BatteryPowerModeEvent) => void;
//# sourceMappingURL=validate.d.ts.map