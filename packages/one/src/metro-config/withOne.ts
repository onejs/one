import path from 'node:path'
import { buildMetroConfigInputFromViteConfig } from '@vxrn/vite-plugin-metro'
import { getViteMetroPluginOptions } from './getViteMetroPluginOptions'
import { loadUserOneOptions } from '../vite/loadConfig'

export type WithOneOptions = {
  /** Absolute path to the project root. Defaults to `process.cwd()`. */
  projectRoot?: string
  /** Router root folder relative to the project root. Defaults to `'app'`. */
  routerRoot?: string
  /** Patterns to exclude from router file resolution. */
  ignoredRouteFiles?: Array<`**/*${string}`>
  /** Routing linking config, mirrors `one({ router: { linking } })`. */
  linking?: unknown
  /** Native setup file path relative to the project root. */
  setupFile?: string | { native?: string; ios?: string; android?: string }
  /**
   * Load the app's vite.config and use the real One native Metro options.
   * Defaults to true so an ejected Metro config matches One's own native path.
   */
  loadViteConfig?: boolean
}

async function loadUserViteMetroOptions(projectRoot: string) {
  const previousCwd = process.cwd()
  const previousIsVxrnCli = process.env.IS_VXRN_CLI

  try {
    process.chdir(projectRoot)
    process.env.IS_VXRN_CLI = 'true'
    return await loadUserOneOptions('build', true)
  } finally {
    process.chdir(previousCwd)
    if (previousIsVxrnCli === undefined) {
      delete process.env.IS_VXRN_CLI
    } else {
      process.env.IS_VXRN_CLI = previousIsVxrnCli
    }
  }
}

/**
 * Produce a Metro config that invokes the same `getMetroConfigFromViteConfig`
 * pipeline that One's native production builds use.
 *
 * The first argument may be a project root. Object input is ignored because
 * the production pipeline loads React Native's Metro defaults internally.
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

  const loaded =
    options.loadViteConfig === false
      ? undefined
      : await loadUserViteMetroOptions(projectRoot)

  // Reuse the proven pipeline rather than re-implementing it: same resolver,
  // same babel transformer path, same sourceExts ordering, same blockList,
  // same @babel/runtime workaround. When possible, load the app's actual
  // vite.config so native.bundlerOptions/defaultConfigOverrides match the
  // One dev/build path.
  const metroPluginOptions =
    loaded?.metroOptions ??
    getViteMetroPluginOptions({
      projectRoot,
      relativeRouterRoot: options.routerRoot ?? 'app',
      ignoredRouteFiles: options.ignoredRouteFiles,
      linking: options.linking,
      setupFile: options.setupFile,
    })

  // Call `buildMetroConfigInputFromViteConfig`, NOT `getMetroConfigFromViteConfig` —
  // the latter calls Metro's `loadConfig`, which loads the user's metro.config.cjs,
  // which calls `withOne`, infinite recursion. The outer `loadConfig` (driven by
  // Metro CLI) does the final config merge.
  const viteConfig = {
    ...loaded?.config?.config,
    root: path.resolve(loaded?.config?.config?.root ?? projectRoot),
  } as any

  const { defaultConfig } = await buildMetroConfigInputFromViteConfig(viteConfig, {
    ...metroPluginOptions,
    mainModuleName: 'one/metro-entry',
  })

  return defaultConfig
}

export default withOne
