import type { BuildArgs, VXRNOptions } from '../types';
export declare const build: (optionsIn: VXRNOptions, buildArgs?: BuildArgs) => Promise<{
    options: {
        clean: boolean;
        root: string;
        server: {
            port: number;
            host: string;
            protocol: "https:" | "http:";
            url: string;
            compress?: boolean;
            cacheHeaders?: "off";
            https?: boolean;
            platform?: import("..").VXRNServePlatform;
            beforeStart?: (options: VXRNOptions, app: import("hono").Hono) => void | Promise<void>;
            afterStart?: (options: VXRNOptions, app: import("hono").Hono) => void | Promise<void>;
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
    };
    buildArgs: BuildArgs;
    serverEntry: string;
    clientOutput: any;
    serverOutput: any;
    serverBuildConfig: Record<string, any>;
    webBuildConfig: Record<string, any>;
    clientManifest: any;
}>;
//# sourceMappingURL=build.d.ts.map