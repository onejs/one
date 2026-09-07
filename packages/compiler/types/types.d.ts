import type { TransformOptions as OxcTransformOptions } from 'oxc-transform';
export type Environment = 'ios' | 'android' | 'ssr' | 'client';
export type Options = {
    environment: Environment;
    mode: 'serve' | 'serve-cjs' | 'build';
    forceJSX?: boolean;
    noHMR?: boolean;
    production?: boolean;
    fixNonTypeSpecificImports?: boolean;
    transform?: GetTransform;
};
export type GetTransformProps = {
    id: string;
    code: string;
    projectRoot?: string;
    development: boolean;
    environment: Environment;
    reactForRNVersion: '18' | '19';
};
export type GetTransform = (props: GetTransformProps) => GetTransformResponse;
export type GetTransformResponse = boolean | 'babel' | 'swc' | 'oxc' | TransformOptions;
export type TransformOptions = BabelTransformOptions | SWCTransformOptions;
export type SWCTransformOptions = {
    transform: 'swc' | 'oxc';
} & OxcTransformOptions;
export type BabelTransformOptions = {
    transform: 'babel';
    excludeDefaultPlugins?: boolean;
} & babel.TransformOptions;
//# sourceMappingURL=types.d.ts.map