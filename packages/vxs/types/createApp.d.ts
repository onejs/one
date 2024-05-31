import type { GlobbedRouteImports } from './types';
export declare function createApp(options: {
    routes: GlobbedRouteImports;
}): {
    options: {
        routes: GlobbedRouteImports;
    };
    render: ({ path }: {
        path: string;
    }) => Promise<string>;
};
//# sourceMappingURL=createApp.d.ts.map