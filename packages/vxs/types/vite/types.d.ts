import type { AfterBuildProps } from 'vxrn';
export type VXSPluginOptions = {
    shouldIgnore?: (req: Request) => boolean;
    disableSSR?: boolean;
    afterBuild?: (props: VXSAfterBuildProps) => void | Promise<void>;
};
export type VXSAfterBuildProps = AfterBuildProps & {
    routeMap: Record<string, string>;
    builtRoutes: VXSRouteBuildInfo[];
};
export type VXSRouteBuildInfo = {
    path: string;
    htmlPath: string;
    clientJsPath: string;
    params: Object;
    loaderData: any;
    preloads: string[];
};
//# sourceMappingURL=types.d.ts.map