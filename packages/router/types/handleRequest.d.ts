import type { RouteInfo } from './routes-manifest';
export type Options = {
    root: string;
    shouldIgnore?: (req: Request) => boolean;
    disableSSR?: boolean;
};
type RequestHandlerProps = {
    request: Request;
    route: RouteInfo<string>;
    url: URL;
    loaderProps?: {
        path: string;
        params: Record<string, any>;
    };
};
type RequestHandlerResponse = null | {
    type?: 'text/javascript' | 'application/json';
    response: string | Response;
};
export declare function createHandleRequest(options: Options, handlers: {
    handleSSR?: (props: RequestHandlerProps) => Promise<any>;
    handleLoader?: (props: RequestHandlerProps) => Promise<any>;
    handleAPI?: (props: RequestHandlerProps) => Promise<any>;
}): (request: Request) => Promise<RequestHandlerResponse>;
export {};
//# sourceMappingURL=handleRequest.d.ts.map