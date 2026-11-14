/**
 * Compiler plugin for One/VXRN
 * Automates babel transforms (react compiler, codegen, user transforms) and
 * react native CSS-to-JS conversion.
 */
import type { PluginOption } from 'vite';
import type { Options } from './types.js';
export * from './configure.js';
export * from './transformBabel.js';
export * from './transformFlow.js';
export * from './transformSWC.js';
export * from './transformWorklets.js';
export * from './reactNativeCodegen.js';
export * from './transformHermesLoops.js';
export * from './transformHermesAsync.js';
export * from './transformHermesClasses.js';
export { clearTransformCache } from './cache.js';
export { JS_GLOBALS } from './worklets/globals.js';
export { getClosureVariables } from './worklets/scope.js';
export type { GetTransform } from './types.js';
export declare function createVXRNCompilerPlugin(optionsIn?: Partial<Options>): Promise<PluginOption[]>;
export * from './transformMixedNativeModule.js';
//# sourceMappingURL=index.d.ts.map