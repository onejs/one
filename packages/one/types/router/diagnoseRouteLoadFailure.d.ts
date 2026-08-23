/**
 * Walks the module graph under `entryUrl` looking for a module the browser
 * refuses to fetch. Returns the blocked module's url, or null when every
 * module in the graph is reachable (which means the import failed for some
 * other reason, such as a syntax error inside one of them).
 */
export declare function findBlockedModule(entryUrl: string): Promise<string | null>;
/**
 * Turns a failed route import into a message that names the responsible file.
 * Returns null when the graph is fully reachable, leaving the original error
 * as the only report.
 */
export declare function diagnoseRouteLoadFailure(routeId: string, routeUrl: string): Promise<string | null>;
//# sourceMappingURL=diagnoseRouteLoadFailure.d.ts.map