import { existsSync } from 'node:fs'
import path from 'node:path'
import type { metroPlugin } from '@vxrn/vite-plugin-metro'
import { buildOneBabelPlugins } from '../babel-preset'
import { buildOneMetroResolverOverrides } from './buildOneMetroResolverOverrides'

/**
 * Detect a user-provided babel config in the project root. When present, we
 * assume the user is delegating to `one/babel-preset` from there and skip
 * injecting plugins on the Vite-driven Metro path to avoid double-application.
 */
function projectHasBabelConfig(projectRoot: string): boolean {
  return ['babel.config.js', 'babel.config.cjs', 'babel.config.mjs', '.babelrc', '.babelrc.js']
    .some((name) => existsSync(path.join(projectRoot, name)))
}

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

  // when user supplies their own babel.config, defer to it (via Metro's own
  // babelrc lookup) and don't inject our plugin list — otherwise we'd apply
  // every One plugin twice. The user is expected to call `one/babel-preset`.
  const userOwnsBabelConfig = projectHasBabelConfig(projectRoot)

  const plugins = userOwnsBabelConfig
    ? []
    : buildOneBabelPlugins({
        projectRoot,
        relativeRouterRoot,
        ignoredRouteFiles,
        linking,
        setupFile,
        // Vite path injects import-meta-env-plugin separately via the
        // Metro server transformFile hook using the user's Vite `define`.
        includeImportMetaEnv: false,
      })

  return {
    defaultConfigOverrides: (defaultConfig) => {
      let config = applyOneResolverOverrides(defaultConfig)

      if (typeof userDefaultConfigOverrides === 'function') {
        config = userDefaultConfigOverrides(config)
      } // TODO: support if userDefaultConfigOverrides is an object, or do not let userDefaultConfigOverrides be an object at all?

      return config
    },
    babelConfig: {
      plugins,
    },
  }
}
