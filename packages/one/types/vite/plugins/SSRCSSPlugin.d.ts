import type { Plugin, ViteDevServer } from 'vite';
export declare const VIRTUAL_ENTRY = "virtual:ssr-css.css";
export declare function SSRCSSPlugin(pluginOpts: {
    entries: string[];
}): Plugin;
export declare function collectStyle(server: ViteDevServer, entries: string[]): Promise<string>;
//# sourceMappingURL=SSRCSSPlugin.d.ts.map