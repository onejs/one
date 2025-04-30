export { serveStatic } from '@hono/node-server/serve-static';
import type { VXRNServeOptions } from '../types';
export { loadEnv } from '../exports/loadEnv';
export * from '../utils/getServerEntry';
export { createProdServer } from './createServer';
export declare const serve: ({ afterRegisterRoutes, beforeRegisterRoutes, app, ...optionsIn }: VXRNServeOptions) => Promise<void>;
//# sourceMappingURL=serve.d.ts.map