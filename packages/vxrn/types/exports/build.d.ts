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
        build?: {
            server?: boolean | import("..").VXRNBuildOptions;
            analyze?: boolean;
        };
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
    serverOutput: any;
    rollupRemoveUnusedImportsPlugin: {
        name: string;
        renderChunk(code: any): {
            code: any;
            map: null;
        };
    };
    serverResolve: {
        alias: {
            'react/jsx-runtime': string;
            react: string;
            'react-dom/server.browser': string;
            'react-dom/client': string;
            'react-dom': string;
        };
    };
    serverBuildConfig: Record<string, any>;
    webBuildConfig: Record<string, any>;
    clientManifest: any;
}>;
//# sourceMappingURL=build.d.ts.map