import type { BackgroundComputation, BackgroundResult, BackgroundState } from './backgroundContract';
export declare function createLatestComputation<Input, Output>(definition: BackgroundComputation<Input, Output>, changed: (state: BackgroundState<Output>) => void): {
    update(input: Input): void;
    getCurrent: () => BackgroundResult<Output> | null;
    dispose(): void;
};
//# sourceMappingURL=createLatestComputation.d.ts.map