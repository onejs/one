import babel from '@babel/core';
import type { GetTransformProps, GetTransformResponse } from './types';
type Props = GetTransformProps & {
    userSetting?: GetTransformResponse;
};
export declare function getBabelOptions(props: Props): babel.TransformOptions | null;
/**
 * Run the react compiler through oxc's rust port instead of babel.
 *
 * measured over 156 real .tsx files in this repo: 1.74ms/file vs babel's
 * 47.57ms/file, with identical memoization decisions (116 memoized by both,
 * zero divergence). `jsx: 'preserve'` leaves JSX alone so vite's own oxc pass
 * still applies the project's jsxImportSource and dev-mode settings, exactly
 * as it did when babel only stripped types here.
 */
export declare function transformOxcReactCompiler(id: string, code: string, target: '18' | '19'): Promise<{
    code: string;
    map: undefined;
}>;
/**
 * Transform input to mostly ES5 compatible code, keep ESM syntax, and transform generators.
 */
export declare function transformBabel(id: string, code: string, options: babel.TransformOptions): Promise<babel.BabelFileResult>;
export {};
//# sourceMappingURL=transformBabel.d.ts.map