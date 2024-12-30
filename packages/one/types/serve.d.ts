import './polyfills-server';
import type { VXRNOptions } from 'vxrn';
export declare function serve(args?: VXRNOptions['server']): Promise<void | import("hono").Hono<import("hono/types").BlankEnv, import("hono/types").BlankSchema, "/"> | {
    handler: (req: Request, requestContext: import("hono/types").FetchEventLike) => Response | Promise<Response>;
    GET: (req: Request, requestContext: import("hono/types").FetchEventLike) => Response | Promise<Response>;
    POST: (req: Request, requestContext: import("hono/types").FetchEventLike) => Response | Promise<Response>;
    PATCH: (req: Request, requestContext: import("hono/types").FetchEventLike) => Response | Promise<Response>;
    PUT: (req: Request, requestContext: import("hono/types").FetchEventLike) => Response | Promise<Response>;
    OPTIONS: (req: Request, requestContext: import("hono/types").FetchEventLike) => Response | Promise<Response>;
}>;
//# sourceMappingURL=serve.d.ts.map