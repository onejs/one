import { type Options } from './vite/createFileSystemRouter';
export { clientTreeShakePlugin } from './vite/clientTreeShakePlugin';
export { createFileSystemRouter } from './vite/createFileSystemRouter';
export { setCurrentRequestHeaders } from './vite/headers';
export { vitePluginSsrCss } from './vite/vitePluginSsrCss';
export declare function getVitePlugins(options: Options): (import("vite").Plugin<any> | {
    name: string;
    enforce: string;
    resolveId(id: any, importer?: string): Promise<string | undefined>;
})[];
//# sourceMappingURL=vite.d.ts.map