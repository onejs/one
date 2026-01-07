import type { InlineConfig } from 'vite'
import type { VXRNOptionsFilled } from './getOptionsFilled'
export declare const dedupe: string[]
/**
 * Returns fundamental Vite configs.
 *
 * Here we returns only configs, without plugins. Basic plugins are defined in
 * `getBaseVitePlugins`. By separating plugins and configs, we try to make
 * things more composable and avoid plugins to be nested.
 *
 * The file is named "getBaseViteConfig**Only**" because there's originally
 * a `getBaseViteConfig` that returns both plugins and configs. The "Only"
 * is added to prevent misuse. We can remove it later when things are settled.
 */
export declare function getBaseViteConfig(
  config: Pick<VXRNOptionsFilled, 'root' | 'mode'>
): Promise<Omit<InlineConfig, 'plugins'>>
//# sourceMappingURL=getBaseViteConfigOnly.d.ts.map
