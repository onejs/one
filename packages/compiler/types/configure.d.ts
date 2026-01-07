import type { Environment } from "./types";
type Conf = {
  enableNativewind?: boolean;
  enableReanimated?: boolean;
  enableCompiler?: boolean | Environment[];
  enableNativeCSS?: boolean;
};
export declare const configuration: Conf;
export declare function configureVXRNCompilerPlugin(_: Conf): void;
export {};
//# sourceMappingURL=configure.d.ts.map
