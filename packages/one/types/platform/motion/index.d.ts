import type { MotionAvailability, MotionReading, MotionSensor } from '../specs/OneMotion.nitro';
export type { MotionAvailability, MotionReading, MotionSensor, MotionVector, } from '../specs/OneMotion.nitro';
export declare const Motion: Readonly<{
    getAvailability: () => MotionAvailability;
    addListener: (_sensor: MotionSensor, _intervalMs: number, _onReading: (reading: MotionReading) => void, _onError: (code: string, message: string) => void) => (() => void);
}>;
//# sourceMappingURL=index.d.ts.map