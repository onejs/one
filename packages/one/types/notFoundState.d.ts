import type { RouteNode } from './router/Route';
export interface NotFoundState {
    notFoundPath: string;
    notFoundRouteNode?: RouteNode;
    originalPath: string;
}
export declare function getNotFoundState(): NotFoundState | null;
export declare function setNotFoundState(state: NotFoundState | null): void;
export declare function clearNotFoundState(): void;
export declare function useNotFoundState(): NotFoundState | null;
export declare function findNearestNotFoundRoute(pathname: string, rootNode: RouteNode | null): RouteNode | null;
export declare function findRouteNodeByPath(notFoundPath: string, rootNode: RouteNode | null): RouteNode | null;
//# sourceMappingURL=notFoundState.d.ts.map