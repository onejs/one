import type { Hono } from 'hono';
import type { DepOptimize, DepPatch, AfterBuildProps as VXRNAfterBuildProps, VXRNOptions } from 'vxrn';
export declare namespace VXS {
    type Options = Omit<VXRNOptions, keyof PluginOptions> & PluginOptions;
    type RouteMode = 'ssg' | 'spa';
    type RouteOptions = {
        routeModes?: Record<string, VXS.RouteMode>;
    };
    type FixDependencies = {
        [key: string]: DepOptimize | DepPatch['patchFiles'];
    };
    type PluginOptions = {
        app?: {
            /**
             * The uid of your native app, this will be used internally in vxs to call
             * `AppRegistry.registerComponent(key)`
             */
            key?: string;
        };
        deps?: FixDependencies;
        redirects?: Redirects;
        shouldIgnore?: (req: Request) => boolean;
        disableSSR?: boolean;
        afterBuild?: (props: AfterBuildProps) => void | Promise<void>;
        afterServerStart?: ((options: Options, server: Hono) => void | Promise<void>) | ((options: Options, server: Hono, buildInfo: AfterServerStartBuildInfo) => void | Promise<void>);
    };
    interface RouteContext {
        keys(): string[];
        (id: string): any;
        <T>(id: string): T;
        resolve(id: string): string;
        id: string;
    }
    type Redirect = {
        source: string;
        destination: string;
        permanent: boolean;
    };
    type Redirects = Redirect[];
    type AfterServerStartBuildInfo = Pick<AfterBuildProps, 'routeMap' | 'builtRoutes'>;
    type AfterBuildProps = VXRNAfterBuildProps & {
        routeMap: Record<string, string>;
        builtRoutes: RouteBuildInfo[];
    };
    type RouteBuildInfo = {
        path: string;
        htmlPath: string;
        clientJsPath: string;
        params: Object;
        loaderData: any;
        preloads: string[];
    };
}
//# sourceMappingURL=types.d.ts.map