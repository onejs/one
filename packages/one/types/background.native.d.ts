import type { BackgroundComputation } from './background/backgroundContract.js';
export { createLatestComputation } from './background/createLatestComputation.js';
export { useBackgroundComputation } from './background/useBackgroundComputation.js';
export type { BackgroundComputation, BackgroundResult, BackgroundState, } from './background/backgroundContract.js';
export declare function defineBackgroundComputation<Input, Output>(calculate: (input: Input) => Output): BackgroundComputation<Input, Output>;
//# sourceMappingURL=background.native.d.ts.map