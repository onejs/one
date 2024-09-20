import type { BuildArgs, VXRNOptions } from '../types';
export declare const build: (optionsIn: VXRNOptions, buildArgs?: BuildArgs) => Promise<{
    options: {
        clean: boolean;
        protocol: "https:" | "http:";
        entries: {
            native: string;
            web?: string;
            server: string;
        };
        packageJSON: import("pkg-types").PackageJson;
        packageVersions: {
            react: string;
            reactNative: string;
        } | undefined;
        state: {
            versionHash?: string;
        };
        packageRootDir: string;
        cacheDir: string;
        host: string;
        root: string;
        port: number;
        hono?: {
            compression?: boolean;
            cacheHeaders?: "off";
        };
        https?: boolean;
        afterBuild?: (props: import("..").AfterBuildProps) => void | Promise<void>;
        afterServerStart?: (options: VXRNOptions, app: import("hono").Hono) => void | Promise<void>;
    };
    buildArgs: BuildArgs;
    clientOutput: any;
    serverOutput: [import("rollup").OutputChunk, ...(import("rollup").OutputChunk | import("rollup").OutputAsset)[]];
    serverBuildConfig: Record<string, any>;
    webBuildConfig: Record<string, any>;
    clientManifest: any;
}>;
//# sourceMappingURL=build.d.ts.map