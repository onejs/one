import type { LightSensorSubscription } from './types.js';
export type { LightSensorMeasurement, LightSensorSubscription } from './types.js';
declare function isAvailable(): boolean;
declare function setUpdateInterval(intervalMs: number): void;
declare function addListener(listener: (event: {
    illuminance: number;
    timestamp: number;
}) => void): LightSensorSubscription;
export declare const LightSensor: Readonly<{
    isAvailable: typeof isAvailable;
    setUpdateInterval: typeof setUpdateInterval;
    addListener: typeof addListener;
}>;
//# sourceMappingURL=index.d.ts.map