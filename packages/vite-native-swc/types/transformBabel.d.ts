import babel from '@babel/core';
type BabelPlugins = babel.TransformOptions['plugins'];
export type GetBabelConfig = (id: string, code: string) => boolean | BabelPlugins;
type BabelPluginGlobalOptions = {
    disableReanimated: boolean;
};
export declare function transformWithBabelIfNeeded(getUserPlugins: GetBabelConfig | undefined, id: string, code: string, development: boolean): Promise<string | undefined>;
export declare function configureBabelPlugin(opts: Partial<BabelPluginGlobalOptions>): void;
export {};
//# sourceMappingURL=transformBabel.d.ts.map