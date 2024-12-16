export declare const getSSRExternalsCachePath: (root: string) => string;
export declare function autoPreBundleDepsForSsrPlugin({ root }: {
    root: string;
}): {
    name: string;
    enforce: "pre";
    config(this: void, _cfg: import("vite").UserConfig, env: import("vite").ConfigEnv): Promise<{
        ssr: {
            optimizeDeps: {
                include: string[];
                exclude: string[];
            };
            noExternal: string[];
        };
    }>;
};
//# sourceMappingURL=autoPreBundleDepsForSsrPlugin.d.ts.map