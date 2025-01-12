import babel from '@babel/core';
import type { Environment } from './types';
type BabelPlugins = babel.TransformOptions['plugins'];
export type TransformBabelOptions = {
    getUserPlugins?: GetBabelConfig;
};
export type GetBabelConfigProps = {
    id: string;
    code: string;
    development: boolean;
    environment: Environment;
    reactForRNVersion: '18' | '19';
};
type Props = TransformBabelOptions & GetBabelConfigProps;
export type GetBabelConfig = (props: Props) => boolean | {
    plugins: Exclude<BabelPlugins, null | undefined>;
    excludeDefaultPlugins?: boolean;
};
export declare function transformWithBabelIfNeeded(props: Props): Promise<string | undefined>;
export {};
//# sourceMappingURL=transformBabel.d.ts.map