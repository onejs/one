/**
 * Adapted from https://github.com/vitejs/vite-plugin-react-swc/blob/main/src/index.ts
 * to work on both native and web, and with reanimated and other babel fallbacks
 */
import type { PluginOption } from 'vite';
import type { Options } from './types';
export * from './transformBabel';
export * from './transformSWC';
export * from './configure';
export declare function createVXRNCompilerPlugin(optionsIn?: Options): PluginOption[];
//# sourceMappingURL=index.d.ts.map