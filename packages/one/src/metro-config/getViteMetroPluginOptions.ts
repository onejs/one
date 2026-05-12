import type { metroPlugin } from '@vxrn/vite-plugin-metro'
import { buildOneBabelPlugins } from '../babel-preset'
import { buildOneMetroResolverOverrides } from './buildOneMetroResolverOverrides'

export function getViteMetroPluginOptions({
  projectRoot,
  relativeRouterRoot,
  ignoredRouteFiles,
  linking,
  userDefaultConfigOverrides,
  setupFile,
}: {
  projectRoot: string
  relativeRouterRoot: string
  ignoredRouteFiles?: Array<`**/*${string}`>
  linking?: unknown
  userDefaultConfigOverrides?: NonNullable<
    Parameters<typeof metroPlugin>[0]
  >['defaultConfigOverrides']
  setupFile?: string | { native?: string; ios?: string; android?: string }
}): Parameters<typeof metroPlugin>[0] {
  const applyOneResolverOverrides = buildOneMetroResolverOverrides({ projectRoot })

  return {
    oneViteMetroBabelConfig: true,
    defaultConfigOverrides: (defaultConfig) => {
      let config = applyOneResolverOverrides(defaultConfig)

      if (typeof userDefaultConfigOverrides === 'function') {
        config = userDefaultConfigOverrides(config)
      } // TODO: support if userDefaultConfigOverrides is an object, or do not let userDefaultConfigOverrides be an object at all?

      return config
    },
    babelConfig: {
      plugins: buildOneBabelPlugins({
        projectRoot,
        relativeRouterRoot,
        ignoredRouteFiles,
        linking,
        setupFile,
        // vite path injects import-meta-env-plugin separately via the
        // metro server transformFile hook using the user's vite `define`.
        includeImportMetaEnv: false,
      }),
    },
  }
}
