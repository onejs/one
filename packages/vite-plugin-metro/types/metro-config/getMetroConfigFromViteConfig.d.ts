import type { ResolvedConfig } from 'vite';
import type { MetroPluginOptions } from '../plugins/metroPlugin';
import type { ExtraConfig, MetroConfigExtended } from './types';
/**
 * Build the Metro config input WITHOUT calling Metro's `loadConfig`. Returns
 * the same shape Metro `loadConfig` expects as its second argument. Use this
 * from a project's `metro.config.cjs` so the outer `loadConfig` (driven by
 * Expo CLI / Metro CLI) is the only one that runs — avoids infinite
 * recursion that would happen if the inner pipeline also called `loadConfig`
 * and re-read the same metro.config.cjs.
 */
export declare function buildMetroConfigInputFromViteConfig(config: ResolvedConfig, metroPluginOptions: MetroPluginOptions): Promise<{
    defaultConfig: any;
    projectRoot: string;
    extraConfig: ExtraConfig;
}>;
export declare function getMetroConfigFromViteConfig(config: ResolvedConfig, metroPluginOptions: MetroPluginOptions): Promise<MetroConfigExtended>;
//# sourceMappingURL=getMetroConfigFromViteConfig.d.ts.map