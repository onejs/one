import type { metroPlugin } from '@vxrn/vite-plugin-metro';
/**
 * On Windows, micromatch.makeRe() produces regex patterns with `[\\/]` or `[^\\/]`
 * instead of `\/` and `[^/]`. Normalize them so the startsWith check works.
 */
export declare function normalizeReSource(source: string): string;
export declare function getViteMetroPluginOptions({ projectRoot, relativeRouterRoot, ignoredRouteFiles, userDefaultConfigOverrides, setupFile, }: {
    projectRoot: string;
    relativeRouterRoot: string;
    ignoredRouteFiles?: Array<`**/*${string}`>;
    userDefaultConfigOverrides?: NonNullable<Parameters<typeof metroPlugin>[0]>['defaultConfigOverrides'];
    setupFile?: string | {
        native?: string;
        ios?: string;
        android?: string;
    };
}): Parameters<typeof metroPlugin>[0];
//# sourceMappingURL=getViteMetroPluginOptions.d.ts.map