import type { Mode, VXRNOptions } from '../types';
export type VXRNOptionsFilled = Awaited<ReturnType<typeof fillOptions>>;
export declare function fillOptions(options: VXRNOptions, { mode }?: {
    mode?: Mode;
}): Promise<{
    readonly debugBundlePaths: {
        readonly ios: string;
        readonly android: string;
    };
    readonly mode: "development" | "production";
    readonly clean: false | "vite";
    readonly root: string;
    readonly server: Required<{
        host?: string;
        port?: number;
        compress?: boolean;
        loadEnv?: boolean;
    }> & {
        url: string;
        protocol: string;
    };
    readonly entries: {
        native: string;
        readonly web?: string;
        readonly server: "./src/entry-server.tsx";
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
    readonly build?: {
        server?: boolean | import("..").VXRNBuildOptions;
        analyze?: boolean;
    };
    readonly debugBundle?: string;
    readonly debug?: string;
}>;
export declare function getOptionsFilled(): {
    readonly debugBundlePaths: {
        readonly ios: string;
        readonly android: string;
    };
    readonly mode: "development" | "production";
    readonly clean: false | "vite";
    readonly root: string;
    readonly server: Required<{
        host?: string;
        port?: number;
        compress?: boolean;
        loadEnv?: boolean;
    }> & {
        url: string;
        protocol: string;
    };
    readonly entries: {
        native: string;
        readonly web?: string;
        readonly server: "./src/entry-server.tsx";
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
    readonly build?: {
        server?: boolean | import("..").VXRNBuildOptions;
        analyze?: boolean;
    };
    readonly debugBundle?: string;
    readonly debug?: string;
} | null;
//# sourceMappingURL=getOptionsFilled.d.ts.map