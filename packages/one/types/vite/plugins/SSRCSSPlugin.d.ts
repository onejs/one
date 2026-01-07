import type { Plugin, ViteDevServer } from 'vite'
export declare function SSRCSSPlugin(pluginOpts: { entries: string[] }): Plugin
export declare function collectStyle(
  server: ViteDevServer,
  entries: string[]
): Promise<string>
//# sourceMappingURL=SSRCSSPlugin.d.ts.map
