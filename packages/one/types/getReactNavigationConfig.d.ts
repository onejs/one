import type { RouteNode } from './router/Route';
export type Screen = string | {
    path: string;
    screens: Record<string, Screen>;
    _route?: RouteNode;
    initialRouteName?: string;
};
export declare function getReactNavigationRouteName(node: RouteNode): string;
type PartialNavigationState = {
    index?: number;
    routes: Array<{
        name: string;
        state?: PartialNavigationState;
    }>;
};
export declare function resolveInitialRouteNameFromState(contextKey: string, state: PartialNavigationState | undefined): string | undefined;
export declare function getReactNavigationConfig(routes: RouteNode, metaOnly: boolean): {
    initialRouteName?: string;
    screens: Record<string, Screen>;
};
export {};
//# sourceMappingURL=getReactNavigationConfig.d.ts.map