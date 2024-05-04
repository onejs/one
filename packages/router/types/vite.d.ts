import type { Plugin } from 'vite';
import { type Options } from './vite/createFileSystemRouter';
export { clientTreeShakePlugin } from './vite/clientTreeShakePlugin';
export { createFileSystemRouter } from './vite/createFileSystemRouter';
export { setCurrentRequestHeaders } from './vite/headers';
export { vitePluginSsrCss } from './vite/vitePluginSsrCss';
export declare function getVitePlugins(options: Options): (Plugin<any> | {
    name: string;
    enforce: "pre";
    resolveId(this: import("rollup").PluginContext, id: string, importer?: string | undefined): Promise<string | undefined>;
})[];
//# sourceMappingURL=vite.d.ts.map