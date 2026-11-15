export declare const WARM_STATE_VERSION = 1;
export declare const DEFAULT_WARM_STATE_MAX_AGE_MS: number;
export declare const WARM_STATE_STORAGE_KEY = "__one_warm_state_v1__";
export type WarmRouteSnapshot = {
    name: string;
    params?: Record<string, unknown>;
    path?: string;
    state?: WarmNavigationSnapshot;
};
export type WarmNavigationSnapshot = {
    index?: number;
    type?: string;
    routes: WarmRouteSnapshot[];
};
export type WarmStateEnvelope = {
    v: typeof WARM_STATE_VERSION;
    schemaVersion: number;
    updatedAt: number;
    pathname?: string;
    state?: WarmNavigationSnapshot;
    sources: Record<string, unknown>;
};
export type WarmStartOptions = {
    enabled?: boolean;
    schemaVersion?: number;
    maxAgeMs?: number;
    /** restore saved navigation state on native launches (default true when enabled) */
    restoreRoute?: boolean;
    /** restore saved route on web SPA root launches when url is "/" (default false) */
    restoreWebRoute?: boolean;
    /** preload saved route modules during boot (default true when enabled) */
    preloadRoutes?: boolean;
    /** glob/prefix/pathname patterns allowed to restore saved route (e.g. ['/inbox', '/feed/*']) */
    includeRoutes?: string[];
    /** glob/prefix/pathname patterns that never restore saved route (e.g. ['/auth/*', '/modal/*']) */
    excludeRoutes?: string[];
    /** custom route alignment / fallback hook returning boolean, fallback path string, or custom snapshot */
    alignRoute?: (saved: {
        pathname: string;
        state: WarmNavigationSnapshot;
    }) => boolean | string | WarmNavigationSnapshot | null | undefined;
};
export type WarmStateStorage = {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
    removeItem: (key: string) => void;
};
export type WarmStateSerializeInput = {
    schemaVersion: number;
    updatedAt: number;
    pathname?: string;
    state?: unknown;
    sources: Record<string, unknown>;
};
export type WarmStateSerializeOutput = {
    json: string;
    updatedAt: number;
};
/** prune functions, symbols, non-finite numbers and deep cycles to json-safe data. */
export declare function sanitizeWarmValue(value: unknown, depth?: number): unknown;
/** strip transient navigation runtime keys so react navigation rehydrates cleanly. */
export declare function toPartialNavigationState(state: unknown, depth?: number): WarmNavigationSnapshot | undefined;
/** sanitize and serialize a warm snapshot envelope into compact json. */
export declare function serializeWarmInputSync(input: WarmStateSerializeInput): WarmStateSerializeOutput;
/** validate raw persisted json once at the storage read boundary. */
export declare function parseWarmEnvelope(raw: string | null | undefined, options: {
    schemaVersion: number;
    maxAgeMs: number;
    now: number;
}): WarmStateEnvelope | null;
/** normalize a path or pattern by stripping query/hash and standardizing leading/trailing slashes. */
export declare function normalizeRoutePattern(pattern: string): string;
/**
 * test whether a candidate pathname matches a glob/prefix/pathname pattern.
 * e.g. '/inbox' matches '/inbox', '/feed/*' matches '/feed/123' and '/feed',
 * '/modal/**' matches '/modal/sheet'. Query and hash are ignored.
 */
export declare function matchRoutePattern(pattern: string, pathname: string): boolean;
//# sourceMappingURL=warmStateShared.d.ts.map