import babel from '@babel/core';
<<<<<<< HEAD
type BabelPlugins = babel.TransformOptions['plugins'];
export type TransformBabelOptions = {
    getUserPlugins?: GetBabelConfig;
};
export type GetBabelConfigProps = {
    id: string;
    code: string;
    development: boolean;
    environment: string;
    reactForRNVersion: '18' | '19';
};
type Props = TransformBabelOptions & GetBabelConfigProps;
export type GetBabelConfig = (props: Props) => boolean | {
    plugins: Exclude<BabelPlugins, null | undefined>;
    excludeDefaultPlugins?: boolean;
};
export declare function transformWithBabelIfNeeded(props: Props): Promise<string | undefined>;
=======
import type { GetTransformProps, GetTransformResponse } from './types';
type Props = GetTransformProps & {
    userSetting?: GetTransformResponse;
};
export declare function getBabelOptions(props: Props): babel.TransformOptions | null;
/**
 * Transform input to mostly ES5 compatible code, keep ESM syntax, and transform generators.
 */
export declare function transformBabel(id: string, code: string, options: babel.TransformOptions): Promise<string>;
>>>>>>> main
export {};
//# sourceMappingURL=transformBabel.d.ts.map