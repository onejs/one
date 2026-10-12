import type { HybridObject } from 'react-native-nitro-modules';
import type { BarometerMeasurement } from '../barometer/types';
export interface OneBarometer extends HybridObject<{
    ios: 'swift';
    android: 'kotlin';
}> {
    isAvailable(): boolean;
    setUpdateInterval(intervalMs: number): void;
    addListener(listener: (event: BarometerMeasurement) => void): () => void;
}
//# sourceMappingURL=OneBarometer.nitro.d.ts.map