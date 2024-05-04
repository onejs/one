import type { Plugin, ViteDevServer } from 'vite';
export declare function vitePluginSsrCss(pluginOpts: {
    entries: string[];
}): Plugin;
export declare function collectStyle(server: ViteDevServer, entries: string[]): Promise<string>;
//# sourceMappingURL=ssrCSSPlugin.d.ts.map