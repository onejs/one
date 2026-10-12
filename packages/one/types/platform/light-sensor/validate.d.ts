import type { LightSensorMeasurement } from './types';
export declare function assertLightSensorListener(listener: unknown): asserts listener is (event: LightSensorMeasurement) => void;
export declare function assertUpdateInterval(intervalMs: unknown): asserts intervalMs is number;
//# sourceMappingURL=validate.d.ts.map