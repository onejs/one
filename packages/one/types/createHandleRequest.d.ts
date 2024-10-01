import type { RouteInfo } from './server/createRoutesManifest';
import type { One } from './vite/types';
type RequestHandlerProps<RouteExtraProps extends Object = {}> = {
    request: Request;
    route: RouteInfo<string> & RouteExtraProps;
    url: URL;
    loaderProps?: {
        path: string;
        params: Record<string, any>;
    };
};
type RequestHandlerResponse = null | string | Response;
export declare function createHandleRequest(options: One.PluginOptions, handlers: {
    handleSSR?: (props: RequestHandlerProps) => Promise<any>;
    handleLoader?: (props: RequestHandlerProps) => Promise<any>;
    handleAPI?: (props: RequestHandlerProps) => Promise<any>;
}): {
    manifest: import("./server/createRoutesManifest").RoutesManifest<string>;
    handler: (request: Request) => Promise<RequestHandlerResponse>;
};
export {};
//# sourceMappingURL=createHandleRequest.d.ts.map