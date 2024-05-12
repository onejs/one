export declare function swapPrebuiltReactModules(cacheDir: string): Promise<{
    name: string;
    enforce: "pre";
    resolveId(this: import("rollup").PluginContext, id: string, importer?: string | undefined): any;
    load(this: import("rollup").PluginContext, id: string): string | undefined;
}>;
//# sourceMappingURL=swapPrebuiltReactModules.d.ts.map