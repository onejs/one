import type { InlineConfig } from 'vite'
import { getBaseViteConfig } from './getBaseViteConfigOnly'
import { getBaseVitePlugins } from './getBaseVitePlugins'

/**
 * Consider using `getBaseViteConfig` and `getBaseVitePlugins` separately to
 * avoid unnecessary plugin nesting and duplication.
 */
export async function getBaseViteConfigWithPlugins(
  options: Parameters<typeof getBaseViteConfig>[0]
): Promise<InlineConfig> {
  return {
    ...(await getBaseViteConfig(options)),
    plugins: getBaseVitePlugins(),
  }
}
