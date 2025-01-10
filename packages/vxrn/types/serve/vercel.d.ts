import type { Hono } from 'hono';
import type { VXRNServeOptions } from '../types';
export declare function honoServeVercel(app: Hono, options: VXRNServeOptions): Promise<{
    handler: (req: Request) => Response | Promise<Response>;
    GET: (req: Request) => Response | Promise<Response>;
    POST: (req: Request) => Response | Promise<Response>;
    PATCH: (req: Request) => Response | Promise<Response>;
    PUT: (req: Request) => Response | Promise<Response>;
    OPTIONS: (req: Request) => Response | Promise<Response>;
}>;
//# sourceMappingURL=vercel.d.ts.map