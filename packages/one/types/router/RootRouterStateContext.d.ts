import type { UrlObject } from './getNormalizedStatePath';
export declare const RootRouterStateContext: import("react").Context<Readonly<{
    key: string;
    index: number;
    routeNames: string[];
    history?: unknown[];
    routes: import("@react-navigation/routers").NavigationRoute<import("@react-navigation/routers").ParamListBase, string>[];
    type: string;
    stale: false;
}> | undefined>;
export declare const RouteInfoContext: import("react").Context<UrlObject | undefined>;
export declare function RootRouterStateContextProvider({ children, }: {
    children: React.ReactNode;
}): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=RootRouterStateContext.d.ts.map