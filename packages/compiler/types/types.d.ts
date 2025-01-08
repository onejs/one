import type { TransformBabelOptions } from './transformBabel';
export type Environment = 'ios' | 'android' | 'ssr' | 'client';
export type Options = {
    environment: Environment;
    mode: 'serve' | 'serve-cjs' | 'build';
    forceJSX?: boolean;
    noHMR?: boolean;
    production?: boolean;
    babel?: TransformBabelOptions;
};
//# sourceMappingURL=types.d.ts.map