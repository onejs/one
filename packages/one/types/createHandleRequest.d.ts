import type { RouteNode } from './router/Route';
import type { RouteInfoCompiled } from './server/createRoutesManifest';
import type { LoaderProps } from './types';
import type { RouteInfo } from './vite/types';
export type RequestHandlers = {
    handlePage?: (props: RequestHandlerProps) => Promise<any>;
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
export declare function runMiddlewares(handlers: RequestHandlers, request: Request, route: RouteInfo, getResponse: () => Promise<Response>): Promise<Response>;
export declare function resolveAPIRoute(handlers: RequestHandlers, request: Request, url: URL, route: RouteInfoCompiled): Promise<Response>;
export declare function resolveLoaderRoute(handlers: RequestHandlers, request: Request, url: URL, route: RouteInfoCompiled): Promise<Response>;
export declare function resolvePageRoute(handlers: RequestHandlers, request: Request, url: URL, route: RouteInfoCompiled): Promise<Response>;
export declare function getURLfromRequestURL(request: Request): URL;
export declare function compileManifest(manifest: {
    pageRoutes: RouteInfo[];
    apiRoutes: RouteInfo[];
}): {
    pageRoutes: RouteInfoCompiled[];
    apiRoutes: RouteInfoCompiled[];
};
export declare function createHandleRequest(handlers: RequestHandlers, { routerRoot }: {
    routerRoot: string;
}): {
    manifest: import("./server/createRoutesManifest").RoutesManifest<string>;
    handler: (request: Request) => Promise<RequestHandlerResponse>;
};
export {};
//# sourceMappingURL=createHandleRequest.d.ts.map