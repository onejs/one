export declare function autoPreBundleDepsForSsrPlugin({ root, disable, }: {
    root: string;
    disable?: boolean;
}): {
    name: string;
    enforce?: undefined;
    config?: undefined;
} | {
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