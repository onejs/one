import type { RouteNode } from './Route';
import type { RouteInfo, RouteInfoCompiled } from './server/createRoutesManifest';
import type { LoaderProps } from './types';
export type RequestHandlers = {
    handleSSR?: (props: RequestHandlerProps) => Promise<any>;
    handleLoader?: (props: RequestHandlerProps) => Promise<any>;
    handleAPI?: (props: RequestHandlerProps) => Promise<any>;
    loadMiddleware?: (route: RouteNode) => Promise<any>;
};
type RequestHandlerProps<RouteExtraProps extends Object = {}> = {
    request: Request;
    route: RouteInfo<string> & RouteExtraProps;
    url: URL;
    loaderProps?: LoaderProps;
};
type RequestHandlerResponse = null | string | Response;
export declare function resolveAPIRoute(handlers: RequestHandlers, request: Request, url: URL, route: RouteInfoCompiled): Promise<Response>;
export declare function resolveLoaderRoute(handlers: RequestHandlers, request: Request, url: URL, route: RouteInfoCompiled): Promise<Response>;
export declare function resolveSSRRoute(handlers: RequestHandlers, request: Request, url: URL, route: RouteInfoCompiled): Promise<Response>;
export declare function getURLfromRequestURL(request: Request): URL;
export declare function compileManifest(manifest: {
    pageRoutes: RouteInfo[];
    apiRoutes: RouteInfo[];
}): {
    pageRoutes: RouteInfoCompiled[];
    apiRoutes: RouteInfoCompiled[];
};
export declare function createHandleRequest(handlers: RequestHandlers): {
    manifest: import("./server/createRoutesManifest").RoutesManifest<string>;
    handler: (request: Request) => Promise<RequestHandlerResponse>;
};
export {};
//# sourceMappingURL=createHandleRequest.d.ts.map