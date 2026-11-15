import type { BackgroundComputation } from './background/backgroundContract.js';
export { createLatestComputation } from './background/createLatestComputation.js';
export { useBackgroundComputation } from './background/useBackgroundComputation.js';
export type { BackgroundComputation, BackgroundResult, BackgroundState, } from './background/backgroundContract.js';
export declare function defineBackgroundComputation<Input, Output>(calculate: (input: Input) => Output): BackgroundComputation<Input, Output>;
export declare function __createBackgroundFunction<Args extends unknown[], Output>(calculate: (input: Args) => Output): (...args: Args) => Promise<Output>;
//# sourceMappingURL=background.native.d.ts.map