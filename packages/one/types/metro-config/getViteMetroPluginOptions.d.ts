import type { metroPlugin } from '@vxrn/vite-plugin-metro';
export declare function getViteMetroPluginOptions({ projectRoot, relativeRouterRoot, ignoredRouteFiles, userDefaultConfigOverrides, }: {
    projectRoot: string;
    relativeRouterRoot: string;
    ignoredRouteFiles?: Array<`**/*${string}`>;
    userDefaultConfigOverrides?: NonNullable<Parameters<typeof metroPlugin>[0]>['defaultConfigOverrides'];
}): Parameters<typeof metroPlugin>[0];
//# sourceMappingURL=getViteMetroPluginOptions.d.ts.map