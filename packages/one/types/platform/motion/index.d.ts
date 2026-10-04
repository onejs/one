import type { MotionAvailability, MotionReading, MotionSensor } from '../specs/OneMotion.nitro';
export type { MotionAvailability, MotionReading, MotionSensor, MotionVector, } from '../specs/OneMotion.nitro';
export declare const Motion: Readonly<{
    getAvailability: () => MotionAvailability;
    addListener: (sensor: MotionSensor, intervalMs: number, onReading: (reading: MotionReading) => void, onError: (code: string, message: string) => void) => (() => void);
}>;
//# sourceMappingURL=index.d.ts.map