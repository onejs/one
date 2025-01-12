<<<<<<< HEAD
type Conf = {
    enableReanimated?: boolean;
    enableCompiler?: boolean;
    enableNativeCSS?: boolean;
};
export declare const configuration: {
    enableReanimated: false;
    enableCompiler: false;
    enableNativeCSS: false;
};
=======
import type { Environment } from './types';
type Conf = {
    enableReanimated?: boolean;
    enableCompiler?: boolean | Environment[];
    enableNativeCSS?: boolean;
};
export declare const configuration: Conf;
>>>>>>> main
export declare function configureVXRNCompilerPlugin(_: Conf): void;
export {};
//# sourceMappingURL=configure.d.ts.map