import type { BackgroundComputation } from './backgroundContract';
export declare function useBackgroundComputation<Input, Output>(definition: BackgroundComputation<Input, Output>, input: Input | null): {
    result: import("./backgroundContract").BackgroundResult<Output> | null;
    getCurrent: () => import("./backgroundContract").BackgroundResult<Output> | null;
};
//# sourceMappingURL=useBackgroundComputation.d.ts.map