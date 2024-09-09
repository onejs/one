import type { VXSRouter } from './interfaces/router';
export declare function createRoute<Path>(): {
    useParams: () => VXSRouter.InputRouteParams<Path>;
    useActiveParams: () => Partial<VXSRouter.InputRouteParams<Path>>;
    createLoader: (a: (props: {
        params: VXSRouter.InputRouteParams<Path>;
    }) => any) => (props: {
        params: VXSRouter.InputRouteParams<Path>;
    }) => any;
};
declare const postIdRoute: {
    useParams: () => VXSRouter.InputRouteParams<"/post/[id]">;
    useActiveParams: () => Partial<VXSRouter.InputRouteParams<"/post/[id]">>;
    createLoader: (a: (props: {
        params: VXSRouter.InputRouteParams<"/post/[id]">;
    }) => any) => (props: {
        params: VXSRouter.InputRouteParams<"/post/[id]">;
    }) => any;
};
export declare const route: {
    post: {
        id: typeof postIdRoute;
    };
};
export {};
//# sourceMappingURL=createRoute.d.ts.map