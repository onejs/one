import type { BrightnessEvent, BrightnessMode } from './types';
export declare function assertBrightnessValue(value: unknown, verb: string): asserts value is number;
export declare function assertSystemMode(mode: unknown): asserts mode is BrightnessMode;
export declare function assertBrightnessListener(listener: unknown): asserts listener is (event: BrightnessEvent) => void;
//# sourceMappingURL=validate.d.ts.map