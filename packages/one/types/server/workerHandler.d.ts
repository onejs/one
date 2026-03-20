import type { One } from '../vite/types';
export type LazyRoutes = {
    serverEntry: () => Promise<{
        default: {
            render: (props: any) => any;
            renderStream?: (props: any) => Promise<ReadableStream>;
        };
    }>;
    pages: Record<string, () => Promise<any>>;
    api: Record<string, () => Promise<any>>;
    middlewares: Record<string, () => Promise<any>>;
};
type WorkerHandlerOptions = {
    oneOptions: One.PluginOptions;
    buildInfo: One.BuildInfo;
    lazyRoutes: LazyRoutes;
};
export declare function createWorkerHandler(options: WorkerHandlerOptions): {
    handleRequest: (request: Request) => Promise<Response | null>;
    updateRoutes: (newBuildInfo: One.BuildInfo, newLazyRoutes?: LazyRoutes) => void;
};
export {};
//# sourceMappingURL=workerHandler.d.ts.map