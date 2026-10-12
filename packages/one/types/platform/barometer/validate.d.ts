import type { BarometerMeasurement } from './types';
export declare function assertBarometerListener(listener: unknown): asserts listener is (event: BarometerMeasurement) => void;
export declare function assertUpdateInterval(intervalMs: unknown): asserts intervalMs is number;
//# sourceMappingURL=validate.d.ts.map