export declare function getSSRWorkerPool(): SSRWorkerPool | null;
export declare function initSSRWorkerPool(entryPath: string, poolSize?: number): SSRWorkerPool;
declare class SSRWorkerPool {
    private workers;
    private nextId;
    private poolSize;
    private entryPath;
    private initialized;
    private initPromise;
    constructor(entryPath: string, poolSize?: number);
    init(): Promise<void>;
    private _init;
    render(renderProps: any): Promise<string> | null;
    shutdown(): Promise<void>;
}
export {};
//# sourceMappingURL=ssrWorkerPool.d.ts.map