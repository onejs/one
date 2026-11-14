import type { LightSensorMeasurement, LightSensorSubscription } from './types.js';
export type { LightSensorMeasurement, LightSensorSubscription } from './types.js';
declare function isAvailable(): boolean;
declare function setUpdateInterval(intervalMs: number): void;
declare function addListener(listener: (event: LightSensorMeasurement) => void): LightSensorSubscription;
export declare const LightSensor: Readonly<{
    isAvailable: typeof isAvailable;
    setUpdateInterval: typeof setUpdateInterval;
    addListener: typeof addListener;
}>;
//# sourceMappingURL=index.native.d.ts.map