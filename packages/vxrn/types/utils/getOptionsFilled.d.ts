import type { VXRNOptions } from '../types';
export type VXRNOptionsFilled = Awaited<ReturnType<typeof getOptionsFilled>>;
export declare function getOptionsFilled(options: VXRNOptions, internal?: {
    mode?: 'dev' | 'prod';
}): Promise<{
    shouldClean: boolean;
    protocol: "https:" | "http:";
    entries: {
        native: string;
        web?: string | undefined;
        server: string;
    };
    packageJSON: import("pkg-types").PackageJson;
    packageVersions: {
        react: string;
        reactNative: string;
    } | undefined;
    state: {
        versionHash?: string | undefined;
    };
    packageRootDir: string;
    cacheDir: string;
    host: string;
    root: string;
    port: number;
    hono?: {
        compression?: boolean | undefined;
        cacheHeaders?: "off" | undefined;
    } | undefined;
    https?: boolean | undefined;
    afterBuild?: ((props: import("..").AfterBuildProps) => void | Promise<void>) | undefined;
    afterServerStart?: ((options: VXRNOptions, app: import("hono").Hono<import("hono/types").BlankEnv, import("hono/types").BlankSchema, "/">) => void | Promise<void>) | undefined;
}>;
//# sourceMappingURL=getOptionsFilled.d.ts.map