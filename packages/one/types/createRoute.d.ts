import type { OneRouter } from './interfaces/router';
export declare function createRoute<Path>(): {
    useParams: () => Partial<TParams>;
    useActiveParams: () => Partial<TParams>;
    createLoader: (a: (props: {
        params: OneRouter.InputRouteParams<Path>;
    }) => any) => (props: {
        params: OneRouter.InputRouteParams<Path>;
    }) => any;
};
declare const postIdRoute: {
    useParams: () => Partial<TParams>;
    useActiveParams: () => Partial<TParams>;
    createLoader: (a: (props: {
        params: OneRouter.InputRouteParams<"/feed/[id]">;
    }) => any) => (props: {
        params: OneRouter.InputRouteParams<"/feed/[id]">;
    }) => any;
};
export declare const route: {
    feed: {
        $id: typeof postIdRoute;
    };
    notifications: {};
    profile: {};
};
export {};
//# sourceMappingURL=createRoute.d.ts.map