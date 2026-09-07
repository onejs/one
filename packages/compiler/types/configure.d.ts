import type { Environment } from './types';
type CompilerFilter = boolean | RegExp | ((id: string, environment: Environment) => boolean);
type CompilerConfig = boolean | Environment[] | RegExp | ((id: string, environment: Environment) => boolean) | {
    web?: CompilerFilter;
    native?: CompilerFilter;
};
type Conf = {
    enableNativewind?: boolean;
    enableReanimated?: boolean;
    enableNativeWorklets?: boolean;
    enableCompiler?: CompilerConfig;
    enableNativeCSS?: boolean;
};
export declare const configuration: Conf;
export declare function isNativeWorkletsEnabled(): boolean;
export declare function configureVXRNCompilerPlugin(_: Conf): void;
export {};
//# sourceMappingURL=configure.d.ts.map