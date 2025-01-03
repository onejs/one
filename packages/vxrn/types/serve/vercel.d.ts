import type { Hono } from 'hono';
import type { VXRNServeOptions } from '../types';
export declare function honoServeVercel(app: Hono, options: VXRNServeOptions): Promise<{
    handler: (req: Request, requestContext: import("hono/types").FetchEventLike) => Response | Promise<Response>;
    GET: (req: Request, requestContext: import("hono/types").FetchEventLike) => Response | Promise<Response>;
    POST: (req: Request, requestContext: import("hono/types").FetchEventLike) => Response | Promise<Response>;
    PATCH: (req: Request, requestContext: import("hono/types").FetchEventLike) => Response | Promise<Response>;
    PUT: (req: Request, requestContext: import("hono/types").FetchEventLike) => Response | Promise<Response>;
    OPTIONS: (req: Request, requestContext: import("hono/types").FetchEventLike) => Response | Promise<Response>;
}>;
//# sourceMappingURL=vercel.d.ts.map