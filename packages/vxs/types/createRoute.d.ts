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
    useParams: () => VXSRouter.InputRouteParams<"/feed/[id]">;
    useActiveParams: () => Partial<VXSRouter.InputRouteParams<"/feed/[id]">>;
    createLoader: (a: (props: {
        params: VXSRouter.InputRouteParams<"/feed/[id]">;
    }) => any) => (props: {
        params: VXSRouter.InputRouteParams<"/feed/[id]">;
    }) => any;
};
export declare const route: {
    post: {
        $id: typeof postIdRoute;
    };
};
export {};
//# sourceMappingURL=createRoute.d.ts.map