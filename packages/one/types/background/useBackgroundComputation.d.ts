import type { BackgroundComputation } from './backgroundContract.js';
export declare function useBackgroundComputation<Input, Output>(definition: BackgroundComputation<Input, Output>, input: Input | null): {
    result: import("./backgroundContract.js").BackgroundResult<Output> | null;
    getCurrent: () => import("./backgroundContract.js").BackgroundResult<Output> | null;
};
//# sourceMappingURL=useBackgroundComputation.d.ts.map