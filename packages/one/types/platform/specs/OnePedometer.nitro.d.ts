import type { HybridObject } from 'react-native-nitro-modules';
import type { PedometerPermissionResponse, PedometerResult } from '../pedometer/types';
export interface OnePedometer extends HybridObject<{
    ios: 'swift';
    android: 'kotlin';
}> {
    isAvailable(): boolean;
    watchStepCount(listener: (result: PedometerResult) => void): () => void;
    getStepCount(startMs: number, endMs: number): Promise<PedometerResult>;
    getPermissions(): Promise<PedometerPermissionResponse>;
    requestPermissions(): Promise<PedometerPermissionResponse>;
}
//# sourceMappingURL=OnePedometer.nitro.d.ts.map