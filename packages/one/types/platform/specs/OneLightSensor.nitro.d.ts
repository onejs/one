import type { HybridObject } from 'react-native-nitro-modules';
import type { LightSensorMeasurement } from '../light-sensor/types';
export interface OneLightSensor extends HybridObject<{
    ios: 'swift';
    android: 'kotlin';
}> {
    isAvailable(): boolean;
    setUpdateInterval(intervalMs: number): void;
    addListener(listener: (event: LightSensorMeasurement) => void): () => void;
}
//# sourceMappingURL=OneLightSensor.nitro.d.ts.map