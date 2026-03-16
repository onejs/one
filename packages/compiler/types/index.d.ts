/**
 * Compiler plugin for One/VXRN
 * Automates babel transforms (react compiler, codegen, user transforms) and
 * react native CSS-to-JS conversion.
 */
import type { PluginOption } from 'vite';
import type { Options } from './types';
export * from './configure';
export * from './transformBabel';
export * from './transformSWC';
export type { GetTransform } from './types';
export declare function createVXRNCompilerPlugin(optionsIn?: Partial<Options>): Promise<PluginOption[]>;
//# sourceMappingURL=index.d.ts.map