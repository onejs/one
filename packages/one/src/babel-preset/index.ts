import module from 'node:module'
import path from 'node:path'
import type { PluginItem, TransformOptions } from '@babel/core'
import { buildOneBabelPlugins } from '../metro-config/buildOneBabelPlugins'

// Babel's `ConfigAPI` shape: cache mutator, env helper, and a cwd accessor.
// The public @babel/core typing omits `cwd()` so we describe it locally.
type BabelConfigAPI = {
  cache?: ((forever?: boolean) => void) & {
    forever?: () => void
    never?: () => void
    using?: (cb: () => unknown) => void
    invalidate?: (cb: () => unknown) => void
  }
  cwd?: () => string
  env?: (...args: unknown[]) => string | undefined
  caller?: <T>(cb: (caller: unknown) => T) => T
}

export type OneBabelPresetOptions = {
  /** Absolute path to the project root. Defaults to the babel `cwd`. */
  projectRoot?: string
  /** Router root folder relative to the project root. Defaults to `'app'`. */
  routerRoot?: string
  /** Route file patterns to exclude (same shape as `one({ router: { ignoredRouteFiles } })`). */
  ignoredRouteFiles?: Array<`**/*${string}`>
  /** Routing linking config, mirrors `one({ router: { linking } })`. */
  linking?: unknown
  /** Path to a native setup file, relative to the project root. */
  setupFile?: string | { native?: string; ios?: string; android?: string }
  /** Whether to include `babel-preset-expo` as the base preset. Defaults to true. */
  includeExpoPreset?: boolean
}

/**
 * Standalone babel preset that drops the same plugin chain that the
 * Vite-driven Metro path applies into any `babel.config.{cjs,js,mjs}` file.
 *
 * Use this from a project's `babel.config.cjs` to make `expo export`,
 * `eas update`, and other Metro-direct workflows produce byte-equivalent
 * bundles to what `vxrn`/`one dev`/`one build` produce internally.
 *
 * @example
 * ```js
 * // babel.config.cjs
 * module.exports = require('one/babel-preset')
 * ```
 *
 * @example
 * ```js
 * // babel.config.cjs (with options)
 * module.exports = (api) =>
 *   require('one/babel-preset')(api, { routerRoot: 'src/routes' })
 * ```
 */
export default function oneBabelPreset(
  api: BabelConfigAPI,
  options: OneBabelPresetOptions = {}
): TransformOptions {
  if (typeof api?.cache === 'function') {
    api.cache(true)
  }

  const projectRoot = path.resolve(
    options.projectRoot ?? (typeof api?.cwd === 'function' ? api.cwd() : process.cwd())
  )

  const presets: PluginItem[] = []

  if (options.includeExpoPreset !== false) {
    const require = module.createRequire(projectRoot + '/')
    try {
      const expoPresetPath = require.resolve('babel-preset-expo')
      presets.push(require(expoPresetPath))
    } catch (e) {
      throw new Error(
        `[one/babel-preset] Could not resolve 'babel-preset-expo' from ${projectRoot}. ` +
          `Install it as a project dependency (it ships with the Expo SDK). ` +
          `If you don't want the Expo base preset, pass { includeExpoPreset: false }.`
      )
    }
  }

  const plugins = buildOneBabelPlugins({
    projectRoot,
    relativeRouterRoot: options.routerRoot ?? 'app',
    ignoredRouteFiles: options.ignoredRouteFiles,
    linking: options.linking,
    setupFile: options.setupFile,
  })

  return { presets, plugins }
}
