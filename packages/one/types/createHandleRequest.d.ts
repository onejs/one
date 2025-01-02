import type { RouteNode } from './Route';
import type { RouteInfo, RouteInfoWithRegex } from './server/createRoutesManifest';
import type { LoaderProps } from './types';
import type { One } from './vite/types';
type RequestHandlers = {
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
export declare function resolveLoaderRoute(handlers: RequestHandlers, request: Request, url: URL, route: RouteInfoWithRegex): Promise<Response>;
export declare function createHandleRequest(options: One.PluginOptions, handlers: RequestHandlers): {
    manifest: import("./server/createRoutesManifest").RoutesManifest<string>;
    handler: (request: Request) => Promise<RequestHandlerResponse>;
};
export {};
//# sourceMappingURL=createHandleRequest.d.ts.map