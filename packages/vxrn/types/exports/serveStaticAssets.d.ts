import type { Context } from 'hono';
export declare function serveStaticAssets({ context, next, outDir, }: {
    context: Context;
    next?: () => Promise<void>;
    outDir?: string;
}): Promise<Response | undefined>;
//# sourceMappingURL=serveStaticAssets.d.ts.map