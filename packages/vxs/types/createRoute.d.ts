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
//# sourceMappingURL=createRoute.d.ts.map