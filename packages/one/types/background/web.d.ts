import type { BackgroundExecutor } from './backgroundContract.js';
export declare function createWorkerExecutor<Input, Output>(createWorker: () => Worker): BackgroundExecutor<Input, Output> & {
    readonly failed: boolean;
};
//# sourceMappingURL=web.d.ts.map