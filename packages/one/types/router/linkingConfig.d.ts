import type { OneRouter } from '../interfaces/router';
import { type OneLinkingOptions } from './getLinkingConfig';
import type { RouteNode } from './Route';
export declare function getLinking(): OneLinkingOptions | undefined;
export declare function setLinking(_: OneLinkingOptions): void;
export declare function resetLinking(): void;
/**
 * Ensure the base linking config is initialized for a given route tree.
 * Does not set any per-request state.
 */
export declare function ensureBaseLinkingConfig(routeNode: RouteNode | null): void;
/**
 * Compute initialState from a URL path, with caching for SSR.
 * Does not modify the global linkingConfig.
 */
export declare function getSSRInitialState(routeNode: RouteNode | null, initialLocation: URL): OneRouter.ResultState | undefined;
export declare function setupLinking(routeNode: RouteNode | null, initialLocation?: URL): OneRouter.ResultState | undefined;
//# sourceMappingURL=linkingConfig.d.ts.map