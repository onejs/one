import type { BuildArgs, VXRNOptions } from '../types';
export declare const build: (optionsIn: VXRNOptions, buildArgs?: BuildArgs) => Promise<{
    options: {
        clean: boolean;
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
    };
    buildArgs: BuildArgs;
    clientOutput: any;
    serverOutput: [import("rollup").OutputChunk, ...(import("rollup").OutputChunk | import("rollup").OutputAsset)[]];
    webBuildConfig: Record<string, any>;
    clientManifest: any;
}>;
//# sourceMappingURL=build.d.ts.map