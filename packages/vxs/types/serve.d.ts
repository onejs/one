import './polyfills-server';
import type { Hono } from 'hono';
import type { VXRNOptions } from 'vxrn';
import type { VXS } from './vite/types';
export declare function serve(options: VXS.Options, vxrnOptions: VXRNOptions, app: Hono): Promise<void>;
//# sourceMappingURL=serve.d.ts.map