import type { Plugin } from 'vite';
import babel from '@babel/core';
type BabelPlugins = babel.TransformOptions['plugins'];
export type TransformBabelOptions = {
    reactCompiler?: boolean;
    reanimated?: boolean;
    getUserPlugins?: GetBabelConfig;
};
export type TransformBabelProps = TransformBabelOptions & {
    id: string;
    code: string;
    development: boolean;
};
export type GetBabelConfig = (id: string, code: string) => boolean | {
    plugins: Exclude<BabelPlugins, null | undefined>;
    excludeDefaultPlugins?: boolean;
};
export declare function transformWithBabelIfNeeded(props: TransformBabelProps): Promise<string | undefined>;
/**
 * ----- react compiler -----
 */
export declare const createReactCompilerPlugin: (root: string) => Plugin;
export {};
//# sourceMappingURL=transformBabel.d.ts.map