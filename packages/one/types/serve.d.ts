import './polyfills-server';
import type { Hono } from 'hono';
import type { VXRNOptions } from 'vxrn';
export declare function serve(args?: VXRNOptions['server'] & {
    app?: Hono;
    outDir?: string;
    cluster?: boolean | number;
}): Promise<void>;
//# sourceMappingURL=serve.d.ts.map