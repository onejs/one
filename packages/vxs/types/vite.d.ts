import './polyfills';
import type { Plugin } from 'vite';
import { type Options } from './vite/createFileSystemRouter';
export { clientTreeShakePlugin } from './vite/clientTreeShakePlugin';
export { createFileSystemRouter } from './vite/createFileSystemRouter';
export { setCurrentRequestHeaders } from './vite/headers';
export { vitePluginSsrCss } from './vite/vitePluginSsrCss';
export { build } from './vite/build';
export { serve } from './vite/serve';
export declare function getVitePlugins(options: Options): Plugin<any>[];
//# sourceMappingURL=vite.d.ts.map