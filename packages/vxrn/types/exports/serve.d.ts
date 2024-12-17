import type { VXRNOptions, VXRNServePlatform } from '../types';
export { createProdServer } from './createServer';
export { loadEnv } from '../exports/loadEnv';
export * from '../utils/getServerEntry';
export declare const serve: (optionsIn: VXRNOptions & {
    platform?: VXRNServePlatform;
}) => Promise<void | {
    handler: (req: Request, requestContext: import("hono/types").FetchEventLike) => Response | Promise<Response>;
    GET: (req: Request, requestContext: import("hono/types").FetchEventLike) => Response | Promise<Response>;
    POST: (req: Request, requestContext: import("hono/types").FetchEventLike) => Response | Promise<Response>;
    PATCH: (req: Request, requestContext: import("hono/types").FetchEventLike) => Response | Promise<Response>;
    PUT: (req: Request, requestContext: import("hono/types").FetchEventLike) => Response | Promise<Response>;
    OPTIONS: (req: Request, requestContext: import("hono/types").FetchEventLike) => Response | Promise<Response>;
}>;
//# sourceMappingURL=serve.d.ts.map