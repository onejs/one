import { type RequestHandlerResponse, type RequestHandlers } from './createHandleRequest.js';
export declare function createHandleRequest(handlers: RequestHandlers, { routerRoot, ignoredRouteFiles, routePaths, }: {
    routerRoot: string;
    ignoredRouteFiles?: string[];
    routePaths?: string[];
}): {
    manifest: import("./server/createRoutesManifest.js").RoutesManifest<string>;
    handler: (request: Request) => Promise<RequestHandlerResponse>;
};
//# sourceMappingURL=createDevHandleRequest.d.ts.map