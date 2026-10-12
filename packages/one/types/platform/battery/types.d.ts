export type BatteryState = 'unknown' | 'unplugged' | 'charging' | 'full' | 'notCharging';
export interface BatteryLevelEvent {
    batteryLevel: number;
}
export interface BatteryStateEvent {
    batteryState: BatteryState;
}
export interface BatteryPowerModeEvent {
    lowPowerMode: boolean;
}
export interface BatteryPowerState {
    batteryLevel: number;
    batteryState: BatteryState;
    lowPowerMode: boolean;
}
export interface BatterySubscription {
    remove(): void;
}
//# sourceMappingURL=types.d.ts.map