import type { BarometerMeasurement, BarometerSubscription } from './types';
export type { BarometerMeasurement, BarometerSubscription } from './types';
declare function isAvailable(): boolean;
declare function setUpdateInterval(intervalMs: number): void;
declare function addListener(listener: (event: BarometerMeasurement) => void): BarometerSubscription;
export declare const Barometer: Readonly<{
    isAvailable: typeof isAvailable;
    setUpdateInterval: typeof setUpdateInterval;
    addListener: typeof addListener;
}>;
//# sourceMappingURL=index.d.ts.map