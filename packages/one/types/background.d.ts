import type { BackgroundComputation } from './background/backgroundContract';
export { createLatestComputation } from './background/createLatestComputation';
export { useBackgroundComputation } from './background/useBackgroundComputation';
export type { BackgroundComputation, BackgroundResult, BackgroundState, } from './background/backgroundContract';
export declare function defineBackgroundComputation<Input, Output>(calculate: (input: Input) => Output): BackgroundComputation<Input, Output>;
//# sourceMappingURL=background.d.ts.map