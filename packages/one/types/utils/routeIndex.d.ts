export declare function getRoutePaths(routerRoot: string, ignoredRouteFiles?: string[]): string[];
export declare function createRouteIndex({ routerRoot, ignoredRouteFiles, }: {
    routerRoot: string;
    ignoredRouteFiles?: string[];
}): {
    getPaths(): string[];
    update(event: string, filePath: string): boolean;
};
export type RouteIndex = ReturnType<typeof createRouteIndex>;
//# sourceMappingURL=routeIndex.d.ts.map