import { type Plugin, type ResolvedConfig, type UserConfig } from 'vite';
import type { DOMDescriptor, DOMManifest, DOMRegistry } from './registry';
export declare const DOM_DEV_PREFIX = "/_one/dom/";
export declare function domEntrySource(descriptor: DOMDescriptor, development?: boolean): string;
export declare function domEntryPlugin(registry: DOMRegistry, development?: () => boolean): Plugin;
export declare function domHTML(id: string): string;
export declare function buildDOMAssets(entries: DOMDescriptor[], registry: DOMRegistry, config: ResolvedConfig, browserPlugins: Plugin[], assetsDest: string, assetsInclude?: UserConfig['assetsInclude']): Promise<DOMManifest>;
//# sourceMappingURL=browser.d.ts.map