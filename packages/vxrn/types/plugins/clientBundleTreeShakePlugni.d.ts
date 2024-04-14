interface TreeShakeTemplatePluginOptions {
    sourcemap?: boolean;
}
export declare const clientBundleTreeShakePlugin: (options: TreeShakeTemplatePluginOptions) => {
    name: string;
    enforce: "post";
    transform(this: import("rollup").TransformPluginContext, code: string, id: string): {
        code: string;
        map: import("magic-string").SourceMap | undefined;
    } | undefined;
};
export {};
//# sourceMappingURL=clientBundleTreeShakePlugni.d.ts.map