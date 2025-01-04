import { Hono } from 'hono';
import type { VXRNServeOptions } from '../types';
export { loadEnv } from '../exports/loadEnv';
export * from '../utils/getServerEntry';
export { createProdServer } from './createServer';
export declare const serve: (optionsIn: VXRNServeOptions) => Promise<void | Hono<import("hono/types").BlankEnv, import("hono/types").BlankSchema, "/"> | {
    handler: (req: Request, requestContext: import("hono/types").FetchEventLike) => Response | Promise<Response>;
    GET: (req: Request, requestContext: import("hono/types").FetchEventLike) => Response | Promise<Response>;
    POST: (req: Request, requestContext: import("hono/types").FetchEventLike) => Response | Promise<Response>;
    PATCH: (req: Request, requestContext: import("hono/types").FetchEventLike) => Response | Promise<Response>;
    PUT: (req: Request, requestContext: import("hono/types").FetchEventLike) => Response | Promise<Response>;
    OPTIONS: (req: Request, requestContext: import("hono/types").FetchEventLike) => Response | Promise<Response>;
}>;
//# sourceMappingURL=serve.d.ts.map