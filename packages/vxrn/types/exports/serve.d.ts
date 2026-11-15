export { serveStatic } from '@hono/node-server/serve-static';
import type { VXRNServeOptions } from '../types.js';
export { loadEnv } from '../exports/loadEnv.js';
export * from '../utils/getServerEntry.js';
export { createProdServer, applyCompression } from './createServer.js';
export { serveStaticAssets, compileCacheRules } from './serveStaticAssets.js';
export type { CompiledCacheRules } from './serveStaticAssets.js';
export declare const serve: ({ afterRegisterRoutes, beforeRegisterRoutes, app, outDir, ...optionsIn }: VXRNServeOptions) => Promise<void>;
//# sourceMappingURL=serve.d.ts.map