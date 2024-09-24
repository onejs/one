import type { BuildArgs, VXRNOptions } from '../types';
export declare const build: (optionsIn: VXRNOptions, buildArgs?: BuildArgs) => Promise<{
    options: {
        clean: boolean;
        root: string;
        server: {
            port: number;
            host: string;
            protocol: "https:" | "http:";
            platform?: "node" | "vercel";
            compression?: boolean;
            cacheHeaders?: "off";
            https?: boolean;
        };
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
        build?: {
            server?: boolean | import("..").VXRNBuildOptions;
            analyze?: boolean;
        };
        afterBuild?: (props: import("..").AfterBuildProps) => void | Promise<void>;
        afterServerStart?: (options: VXRNOptions, app: import("hono").Hono) => void | Promise<void>;
    };
    buildArgs: BuildArgs;
    clientOutput: any;
    serverOutput: any;
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