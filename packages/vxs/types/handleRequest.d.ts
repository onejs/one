import type { RouteInfo } from './server/createRoutesManifest';
import type { VXS } from './vite/types';
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
export declare function createHandleRequest(options: VXS.PluginOptions, handlers: {
    handleSSR?: (props: RequestHandlerProps) => Promise<any>;
    handleLoader?: (props: RequestHandlerProps) => Promise<any>;
    handleAPI?: (props: RequestHandlerProps) => Promise<any>;
}): {
    manifest: import("./server/createRoutesManifest").RoutesManifest<string>;
    handler: (request: Request) => Promise<RequestHandlerResponse>;
};
export {};
//# sourceMappingURL=handleRequest.d.ts.map