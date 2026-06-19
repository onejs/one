export declare function stripTrailingSlash(pathname: string): string;
export declare function normalizeRoutePathname(pathname: string): string;
export declare function hasLostDynamicSegment(path: string): boolean;
export declare function getSafeWindowPathname(): string | undefined;
export declare function getSafeWindowPath(): string | undefined;
export declare function getPathWithRecoveredDynamicSegment(paths: readonly (string | undefined)[], fallbackPath?: string | undefined): string | undefined;
export declare function getPathnameWithRecoveredDynamicSegment(pathname: string, fallbackPath?: string | undefined): string;
//# sourceMappingURL=path.d.ts.map