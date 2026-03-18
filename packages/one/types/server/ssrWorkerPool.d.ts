export declare function initSSRWorkerPool(serverEntryPath: string): Promise<void>;
/**
 * register static route data on all workers (preloads, css, etc.)
 * called once per unique route, before the first render for that route.
 */
export declare function ensureRouteRegistered(routeKey: string, staticData: {
    mode: string;
    preloads?: string[];
    deferredPreloads?: string[];
    css?: string[];
    cssContents?: string[];
}): void;
export declare function renderOnWorker(routeKey: string, renderProps: any): Promise<string>;
export declare function isWorkerPoolAvailable(): boolean;
export declare function shutdownSSRWorkerPool(): Promise<void>;
//# sourceMappingURL=ssrWorkerPool.d.ts.map