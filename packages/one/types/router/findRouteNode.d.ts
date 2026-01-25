import type { RouteNode } from './Route';
/**
 * Find a RouteNode from the route tree based on the navigation state.
 * Walks through the state's routes recursively to find the deepest matching route.
 */
export declare function findRouteNodeFromState(state: {
    routes: Array<{
        name: string;
        state?: any;
    }>;
} | undefined, rootNode: RouteNode | null): RouteNode | null;
/**
 * Extract params from navigation state.
 * Collects params from all routes in the state hierarchy.
 */
export declare function extractParamsFromState(state: {
    routes: Array<{
        name: string;
        params?: Record<string, any>;
        state?: any;
    }>;
} | undefined): Record<string, string | string[]>;
/**
 * Extract search params from href string.
 */
export declare function extractSearchFromHref(href: string): Record<string, string | string[]>;
/**
 * Extract pathname from href string.
 */
export declare function extractPathnameFromHref(href: string): string;
/**
 * Find all route nodes from root to the current page based on navigation state.
 * Returns an array of RouteNodes in order from root layout to the page.
 * This is used on native to build the full matches array including layouts.
 */
export declare function findAllRouteNodesFromState(state: {
    routes: Array<{
        name: string;
        state?: any;
    }>;
} | undefined, rootNode: RouteNode | null): RouteNode[];
//# sourceMappingURL=findRouteNode.d.ts.map