export declare class BuildWorkerPool {
    private workers;
    private available;
    private taskQueue;
    private pendingById;
    private nextId;
    private readyCount;
    private initCount;
    private _ready;
    private _resolveReady;
    private _initialized;
    private _resolveInitialized;
    private _terminated;
    private _config;
    constructor(size?: number);
    get size(): number;
    ready(): Promise<void>;
    initialize(config: any): Promise<void>;
    private dispatch;
    buildPage(args: {
        serverEntry: string;
        path: string;
        relativeId: string;
        params: any;
        foundRoute: any;
        clientManifestEntry: any;
        staticDir: string;
        clientDir: string;
        builtMiddlewares: Record<string, string>;
        serverJsPath: string;
        preloads: string[];
        allCSS: string[];
        routePreloads: Record<string, string>;
        allCSSContents?: string[];
        criticalPreloads?: string[];
        deferredPreloads?: string[];
        useAfterLCP?: boolean;
        useAfterLCPAggressive?: boolean;
    }): Promise<any>;
    terminate(): Promise<void>;
}
export declare function getWorkerPool(size?: number): BuildWorkerPool;
export declare function terminateWorkerPool(): Promise<void>;
//# sourceMappingURL=workerPool.d.ts.map