import type { One } from '../vite/types';
export type LazyRoutes = {
    pages?: Record<string, () => Promise<any>>;
    serverEntry: () => Promise<{
        default: {
            render: (props: any) => any;
            renderStream?: (props: any) => Promise<ReadableStream>;
        };
    }>;
    api: Record<string, () => Promise<any>>;
    middlewares: Record<string, () => Promise<any>>;
};
type ServedBuildInfo = Omit<One.BuildInfo, 'routeMap'> & Partial<Pick<One.BuildInfo, 'routeMap'>>;
type WorkerHandlerOptions = {
    oneOptions: One.PluginOptions;
    buildInfo: ServedBuildInfo;
    lazyRoutes: LazyRoutes;
    disableModuleCache?: boolean;
};
export declare function createWorkerHandler(options: WorkerHandlerOptions): {
    handleRequest: (request: Request, env?: unknown, executionCtx?: unknown) => Promise<Response | null>;
    updateRoutes: (newBuildInfo: ServedBuildInfo, newLazyRoutes?: LazyRoutes) => void;
};
export {};
//# sourceMappingURL=workerHandler.d.ts.map