import type { OneRouter } from '../interfaces/router';
export declare function createRoute<Path extends string = string>(): {
    useParams: () => Partial<OneRouter.RouteType<Path>["Params"]>;
    useActiveParams: () => Partial<OneRouter.RouteType<Path>["Params"]>;
    /**
     * Creates a typed loader function for this route.
     * The loader receives LoaderProps with typed params.
     *
     * @example
     * const route = createRoute<'(site)/docs/[slug]'>()
     * export const loader = route.createLoader(({ params }) => {
     *   // params is typed as { slug: string }
     *   return { doc: getDoc(params.slug) }
     * })
     */
    createLoader: <T>(fn: (props: {
        path: string;
        search?: string;
        subdomain?: string;
        params: OneRouter.RouteType<Path>["Params"];
        request?: Request;
    }) => T) => (props: {
        path: string;
        search?: string;
        subdomain?: string;
        params: OneRouter.RouteType<Path>["Params"];
        request?: Request;
    }) => T;
};
declare const postIdRoute: {
    useParams: () => Partial<OneRouter.InputRouteParams<"/feed/[id]">>;
    useActiveParams: () => Partial<OneRouter.InputRouteParams<"/feed/[id]">>;
    /**
     * Creates a typed loader function for this route.
     * The loader receives LoaderProps with typed params.
     *
     * @example
     * const route = createRoute<'(site)/docs/[slug]'>()
     * export const loader = route.createLoader(({ params }) => {
     *   // params is typed as { slug: string }
     *   return { doc: getDoc(params.slug) }
     * })
     */
    createLoader: <T>(fn: (props: {
        path: string;
        search?: string;
        subdomain?: string;
        params: OneRouter.InputRouteParams<"/feed/[id]">;
        request?: Request;
    }) => T) => (props: {
        path: string;
        search?: string;
        subdomain?: string;
        params: OneRouter.InputRouteParams<"/feed/[id]">;
        request?: Request;
    }) => T;
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