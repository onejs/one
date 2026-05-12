import path from 'node:path'
import { buildMetroConfigInputFromViteConfig } from '@vxrn/vite-plugin-metro'
import { getViteMetroPluginOptions } from './getViteMetroPluginOptions'

export type WithOneOptions = {
  /** Absolute path to the project root. Defaults to `process.cwd()`. */
  projectRoot?: string
  /** Router root folder relative to the project root. Defaults to `'app'`. */
  routerRoot?: string
  /** Patterns to exclude from router file resolution. */
  ignoredRouteFiles?: Array<`**/*${string}`>
  /** Routing linking config — mirrors `one({ router: { linking } })`. */
  linking?: unknown
  /** Native setup file path relative to the project root. */
  setupFile?: string | { native?: string; ios?: string; android?: string }
}

/**
 * Produce a Metro config that invokes the EXACT same `getMetroConfigFromViteConfig`
 * pipeline that One's native production builds use. This way `expo export`,
 * `eas update`, and any other Metro-direct workflow produce a bundle that's
 * byte-equivalent to what `react-native bundle` (the iOS build phase) produces.
 *
 * The first argument is ignored — kept only for ergonomic compatibility with
 * the typical `withOne(getDefaultConfig(__dirname))` call shape that Expo
 * users are used to. We discard it because @expo/metro-config's defaults
 * differ from what One needs, and the production pipeline applies its own
 * defaults internally.
 *
 * @example
 * ```js
 * // metro.config.cjs
 * const { withOne } = require('one/metro-config')
 *
 * module.exports = withOne(__dirname)
 * ```
 */
export async function withOne(
  baseConfigOrProjectRoot: string | object | undefined,
  options: WithOneOptions = {}
): Promise<unknown> {
  const projectRoot = path.resolve(
    typeof baseConfigOrProjectRoot === 'string'
      ? baseConfigOrProjectRoot
      : (options.projectRoot ?? process.cwd())
  )

  // Reuse the proven pipeline rather than re-implementing it: same resolver,
  // same babel transformer path, same sourceExts ordering, same blockList,
  // same @babel/runtime workaround.
  //
  // Call `buildMetroConfigInputFromViteConfig`, NOT `getMetroConfigFromViteConfig` —
  // the latter calls Metro's `loadConfig`, which loads the user's metro.config.cjs,
  // which calls `withOne`, infinite recursion. The outer `loadConfig` (driven by
  // Expo CLI / Metro CLI) does the final config merge.
  const metroPluginOptions = getViteMetroPluginOptions({
    projectRoot,
    relativeRouterRoot: options.routerRoot ?? 'app',
    ignoredRouteFiles: options.ignoredRouteFiles,
    linking: options.linking,
    setupFile: options.setupFile,
  })

  // synthetic ResolvedConfig — the pipeline only reads `root` directly
  const syntheticViteConfig = { root: projectRoot } as any

  const { defaultConfig } = await buildMetroConfigInputFromViteConfig(
    syntheticViteConfig,
    {
      ...metroPluginOptions,
      mainModuleName: 'one/metro-entry',
    }
  )

  return defaultConfig
}

export default withOne
