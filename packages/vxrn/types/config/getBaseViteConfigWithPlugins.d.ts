import type { InlineConfig } from 'vite'
import { getBaseViteConfig } from './getBaseViteConfigOnly'
/**
 * Consider using `getBaseViteConfig` and `getBaseVitePlugins` separately to
 * avoid unnecessary plugin nesting and duplication.
 */
export declare function getBaseViteConfigWithPlugins(
  options: Parameters<typeof getBaseViteConfig>[0]
): Promise<InlineConfig>
//# sourceMappingURL=getBaseViteConfigWithPlugins.d.ts.map
