import type { LightSensorMeasurement } from './types';
declare function isAvailable(): boolean;
declare function setUpdateInterval(_intervalMs: number): void;
declare function addListener(_listener: (event: LightSensorMeasurement) => void): () => void;
export declare function lightSensorNative(): {
    isAvailable: typeof isAvailable;
    setUpdateInterval: typeof setUpdateInterval;
    addListener: typeof addListener;
};
export {};
//# sourceMappingURL=backend.ios.d.ts.map