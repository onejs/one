import type { RouteInfo } from './server/createRoutesManifest';
import type { VXS } from './vite/types';
type RequestHandlerProps = {
    request: Request;
    route: RouteInfo<string>;
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
}): (request: Request) => Promise<RequestHandlerResponse>;
export {};
//# sourceMappingURL=handleRequest.d.ts.map