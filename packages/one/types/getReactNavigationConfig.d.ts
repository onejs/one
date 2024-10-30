import type { RouteNode } from './Route';
export type Screen = string | {
    path: string;
    screens: Record<string, Screen>;
    _route?: RouteNode;
    initialRouteName?: string;
};
export declare function getReactNavigationConfig(routes: RouteNode, metaOnly: boolean): {
    initialRouteName?: string;
    screens: Record<string, Screen>;
};
//# sourceMappingURL=getReactNavigationConfig.d.ts.map