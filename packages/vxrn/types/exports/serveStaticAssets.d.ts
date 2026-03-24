import type { Context } from 'hono';
export type CompiledCacheRules = {
    re: RegExp;
    values: string[];
};
/**
 * compile a cacheControl config (glob → header) into a single regex.
 * each unique header value gets a capturing group — one regex.test()
 * per request, then the matched group index maps to the header value.
 */
export declare function compileCacheRules(cacheControl: Record<string, string>): CompiledCacheRules;
export declare function serveStaticAssets({ context, next, outDir, cacheRules, }: {
    context: Context;
    next?: () => Promise<void>;
    outDir?: string;
    cacheRules?: CompiledCacheRules;
}): Promise<Response | undefined>;
//# sourceMappingURL=serveStaticAssets.d.ts.map