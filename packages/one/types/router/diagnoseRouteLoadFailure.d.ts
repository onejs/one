export type RouteLoadFault = {
    kind: 'blocked';
    url: string;
} | {
    kind: 'missing';
    url: string;
    importer: string | null;
};
/**
 * Walks the module graph under `entryUrl` looking for a module that cannot
 * load: one the dev server answers 404 for, or one the browser refuses to
 * fetch. Returns null when every module in the graph is reachable (which means
 * the import failed for some other reason, such as a syntax error inside one
 * of them).
 */
export declare function findRouteLoadFault(entryUrl: string): Promise<RouteLoadFault | null>;
/**
 * Turns a failed route import into a message that names the responsible file.
 * Returns null when the graph is fully reachable, leaving the original error
 * as the only report.
 */
export declare function diagnoseRouteLoadFailure(routeId: string, routeUrl: string): Promise<string | null>;
//# sourceMappingURL=diagnoseRouteLoadFailure.d.ts.map