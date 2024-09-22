import type { VXRNOptions } from '../types';
export type VXRNOptionsFilled = Awaited<ReturnType<typeof getOptionsFilled>>;
export declare function getOptionsFilled(options: VXRNOptions, internal?: {
    mode?: 'dev' | 'prod';
}): Promise<{
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
}>;
//# sourceMappingURL=getOptionsFilled.d.ts.map