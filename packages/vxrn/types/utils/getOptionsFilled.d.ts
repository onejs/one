import type { VXRNOptions } from '../types';
export type VXRNOptionsFilled = Awaited<ReturnType<typeof fillOptions>>;
export declare function fillOptions(options: VXRNOptions, internal?: {
    mode?: 'dev' | 'prod';
}): Promise<{
    mode: "development" | "production";
    clean: boolean;
    root: string;
    server: {
        port: number;
        host: string;
        protocol: "https:" | "http:";
        url: string;
        compress?: boolean;
        cacheHeaders?: "off";
        loadEnv?: boolean;
        https?: boolean;
        platform?: import("..").VXRNServePlatform;
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
}>;
export declare function getOptionsFilled(): {
    mode: "development" | "production";
    clean: boolean;
    root: string;
    server: {
        port: number;
        host: string;
        protocol: "https:" | "http:";
        url: string;
        compress?: boolean;
        cacheHeaders?: "off";
        loadEnv?: boolean;
        https?: boolean;
        platform?: import("..").VXRNServePlatform;
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
} | null;
//# sourceMappingURL=getOptionsFilled.d.ts.map