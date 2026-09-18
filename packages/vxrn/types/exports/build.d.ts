import type { OutputAsset, OutputChunk } from 'rolldown';
import type { BuildArgs, VXRNOptions } from '../types';
export declare const build: (optionsIn: VXRNOptions, buildArgs?: BuildArgs) => Promise<void | {
    outDir: string;
    processEnvDefines: {
        [k: string]: string;
    };
    options: {
        readonly skipEnv?: boolean;
        readonly build?: {
            server?: boolean | import("..").VXRNBuildOptions;
            analyze?: boolean;
        };
        readonly debugBundle?: string;
        readonly debug?: string;
        readonly debugBundlePaths: {
            readonly ios: string;
            readonly android: string;
        };
        readonly mode: "development" | "production";
        readonly clean: "vite" | false;
        readonly root: string;
        readonly server: import("..").VXRNServeOptionsFilled;
        readonly entries: {
            readonly web?: string;
            native: string;
            readonly server: './src/entry-server.tsx';
        };
        readonly packageJSON: import("pkg-types").PackageJson;
        readonly packageVersions: {
            react: string;
            reactNative: string;
        } | undefined;
        readonly state: {
            versionHash?: string;
        };
        readonly packageRootDir: string;
        readonly cacheDir: string;
        readonly versionHash: string;
    };
    buildArgs: BuildArgs;
    serverEntry: string;
    clientOutput: any;
    serverOutput: [OutputChunk, ...(OutputAsset | OutputChunk)[]] | undefined;
    serverBuildConfig: Record<string, any>;
    webBuildConfig: Record<string, any>;
    clientManifest: any;
}>;
//# sourceMappingURL=build.d.ts.map