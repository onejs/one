import type { VXRNServeOptions } from '../types';
import type { Hono } from 'hono';
export declare const applyCompression: (app: Hono, options: VXRNServeOptions) => void;
export declare const createProdServer: (app: Hono, options: VXRNServeOptions, { skipCompression }?: {
    skipCompression?: boolean;
}) => Promise<Hono<import("hono/types").BlankEnv, import("hono/types").BlankSchema, "/">>;
//# sourceMappingURL=createServer.d.ts.map