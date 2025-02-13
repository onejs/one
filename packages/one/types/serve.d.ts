import './polyfills-server';
import type { Hono } from 'hono';
import type { VXRNOptions } from 'vxrn';
export declare function serve(args?: VXRNOptions['server'] & {
    app?: Hono;
}): Promise<void | Hono<import("hono/types").BlankEnv, import("hono/types").BlankSchema, "/"> | {
    handler: (req: Request) => Response | Promise<Response>;
    GET: (req: Request) => Response | Promise<Response>;
    POST: (req: Request) => Response | Promise<Response>;
    PATCH: (req: Request) => Response | Promise<Response>;
    PUT: (req: Request) => Response | Promise<Response>;
    OPTIONS: (req: Request) => Response | Promise<Response>;
}>;
//# sourceMappingURL=serve.d.ts.map