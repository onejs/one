import type { MotionAvailability, MotionReading, MotionSensor } from '../specs/OneMotion.nitro';
export type { MotionAvailability, MotionReading, MotionSensor, MotionVector } from '../specs/OneMotion.nitro';
declare function getAvailability(): MotionAvailability;
declare function addListener(sensor: MotionSensor, intervalMs: number, onReading: (reading: MotionReading) => void, onError: (code: string, message: string) => void): () => void;
export declare const Motion: Readonly<{
    getAvailability: typeof getAvailability;
    addListener: typeof addListener;
}>;
//# sourceMappingURL=index.native.d.ts.map