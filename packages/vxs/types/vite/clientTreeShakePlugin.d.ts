import type { Plugin } from 'vite';
interface TreeShakeTemplatePluginOptions {
    sourcemap?: boolean;
}
export declare const clientTreeShakePlugin: (options?: TreeShakeTemplatePluginOptions) => Plugin;
export declare function transformTreeShakeClient(code: string, id: string, settings: {
    ssr?: boolean;
} | undefined, parse: any, root: string): Promise<{
    code: string;
    map: import("magic-string").SourceMap;
} | undefined>;
export {};
//# sourceMappingURL=clientTreeShakePlugin.d.ts.map