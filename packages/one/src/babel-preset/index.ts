import module from 'node:module'
import path from 'node:path'
import type { PluginItem, TransformOptions } from '@babel/core'
import mm from 'micromatch'
import tsconfigPaths from 'tsconfig-paths'
import {
  API_ROUTE_GLOB_PATTERN,
  ROUTE_NATIVE_EXCLUSION_GLOB_PATTERNS,
} from '../router/glob-patterns'

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
  /**
   * Whether to include `@vxrn/vite-plugin-metro/babel-plugins/import-meta-env-plugin`.
   * Defaults to true. The Vite-driven Metro server injects this separately via
   * `patchMetroServerWithViteConfigAndMetroPluginOptions` using the user's Vite
   * `define` config — so the Vite path passes `false`. Re-applying is idempotent.
   */
  includeImportMetaEnv?: boolean
}

/**
 * Standalone babel preset that drops the same plugin chain that the
 * Vite-driven Metro path applies into any `babel.config.{cjs,js,mjs}` file.
 *
 * @example
 * ```js
 * // babel.config.cjs
 * module.exports = require('one/babel-preset')
 * ```
 */
export default function oneBabelPreset(
  api: BabelConfigAPI,
  options: OneBabelPresetOptions = {}
): TransformOptions {
  const hasViteInjectedOnePlugins =
    typeof api?.caller === 'function'
      ? api.caller((caller) => !!(caller as any)?.oneViteMetroBabelConfig)
      : false

  if (!api?.caller && typeof api?.cache === 'function') {
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

  return {
    presets,
    plugins: hasViteInjectedOnePlugins
      ? []
      : buildOneBabelPlugins({
          projectRoot,
          relativeRouterRoot: options.routerRoot ?? 'app',
          ignoredRouteFiles: options.ignoredRouteFiles,
          linking: options.linking,
          setupFile: options.setupFile,
          includeImportMetaEnv: options.includeImportMetaEnv,
        }),
  }
}

export type BuildOneBabelPluginsOptions = {
  projectRoot: string
  relativeRouterRoot: string
  ignoredRouteFiles?: Array<`**/*${string}`>
  linking?: unknown
  setupFile?: string | { native?: string; ios?: string; android?: string }
  includeImportMetaEnv?: boolean
}

/**
 * The plugin chain shared between the Vite-driven Metro path
 * (`getViteMetroPluginOptions`) and the standalone preset above.
 */
export function buildOneBabelPlugins({
  projectRoot,
  relativeRouterRoot,
  ignoredRouteFiles,
  linking,
  setupFile,
  includeImportMetaEnv = true,
}: BuildOneBabelPluginsOptions): PluginItem[] {
  const tsconfig = tsconfigPaths.loadConfig(projectRoot)
  if (tsconfig.resultType === 'failed') {
    throw new Error('[one/babel-preset] tsconfig.json paths could not be loaded')
  }

  const require = module.createRequire(projectRoot + '/')
  const metroEntryPath = require.resolve('one/metro-entry', { paths: [projectRoot] })

  const setupFileRelativeToMetroEntry = (() => {
    if (!setupFile) return undefined
    const file =
      typeof setupFile === 'string'
        ? setupFile
        : setupFile.native || setupFile.ios || setupFile.android
    if (!file) return undefined
    return path.relative(path.dirname(metroEntryPath), path.join(projectRoot, file))
  })()

  return [
    // standalone Metro CLI (expo export, eas update) needs `import.meta.env.*` /
    // `process.env.*` baked in. The Vite path passes `false` here and injects
    // its own version with the user's `define` env via the server hook.
    ...(includeImportMetaEnv
      ? [
          [
            '@vxrn/vite-plugin-metro/babel-plugins/import-meta-env-plugin',
            { env: buildStandaloneImportMetaEnv() },
          ] as PluginItem,
        ]
      : []),
    'one/babel-plugin-environment-guard',
    ['one/babel-plugin-remove-server-code', { routerRoot: relativeRouterRoot }],
    [
      'babel-plugin-module-resolver',
      // "vite-tsconfig-paths" for Metro
      {
        alias: Object.fromEntries(
          Object.entries(tsconfig.paths).map(([k, v]) => {
            // exact-match aliases need a trailing `$`, prefix aliases drop `/*`
            const key = k.endsWith('/*') ? k.replace(/\/\*$/, '') : `${k}$`
            let value = v[0].replace(/\/\*$/, '')
            if (!value.startsWith('./')) value = `./${value}`
            return [key, value]
          })
        ),
      },
    ],
    [
      'one/babel-plugin-one-router-metro',
      {
        ONE_ROUTER_APP_ROOT_RELATIVE_TO_ENTRY: path.relative(
          path.dirname(metroEntryPath),
          path.join(projectRoot, relativeRouterRoot)
        ),
        ONE_ROUTER_ROOT_FOLDER_NAME: relativeRouterRoot,
        ONE_ROUTER_REQUIRE_CONTEXT_REGEX_STRING:
          buildRouterRequireContextRegexString(ignoredRouteFiles),
        ONE_ROUTER_LINKING_CONFIG: linking,
        ONE_SETUP_FILE_NATIVE: setupFileRelativeToMetroEntry,
      },
    ],
    'one/babel-plugin-inline-one-server-url',
  ]
}

/**
 * Build the `import.meta.env` substitution map for standalone Metro use.
 * Mirrors Vite's default `define`: MODE/BASE_URL/PROD/DEV/SSR plus any
 * `EXPO_PUBLIC_*` / `ONE_*` / `VITE_*` env var from `process.env`.
 */
function buildStandaloneImportMetaEnv(): Record<string, unknown> {
  const isProduction = process.env.NODE_ENV !== 'development'
  const env: Record<string, unknown> = {
    MODE: isProduction ? 'production' : 'development',
    BASE_URL: '/',
    PROD: isProduction,
    DEV: !isProduction,
    SSR: false,
  }
  for (const [key, value] of Object.entries(process.env)) {
    if (
      key.startsWith('EXPO_PUBLIC_') ||
      key.startsWith('ONE_') ||
      key.startsWith('VITE_')
    ) {
      env[key] = value
    }
  }
  return env
}

/**
 * On Windows, micromatch.makeRe() produces `[\\/]` / `[^\\/]` instead of `\/` / `[^/]`.
 * Normalize so the prefix/suffix check below works cross-platform.
 */
function normalizeReSource(source: string): string {
  return source.replace(/\[\\\\\/\]/g, '\\/').replace(/\[\^\\\\\/\]/g, '[^/]')
}

export function buildRouterRequireContextRegexString(
  ignoredRouteFiles?: Array<`**/*${string}`>
): string {
  const excludeRes = [
    ...(ignoredRouteFiles || []).map((pattern) => mm.makeRe(pattern)),
    ...ROUTE_NATIVE_EXCLUSION_GLOB_PATTERNS.map((pattern) => mm.makeRe(pattern)),
    mm.makeRe(API_ROUTE_GLOB_PATTERN),
  ]

  const mustStartWith = String.raw`^(?:(?:^|\/|(?:(?:(?!(?:^|\/)\.).)*?)\/)(?!\.)(?=.)[^/]*?`
  // biome-ignore lint/complexity/noUselessStringRaw: keep original code
  const mustEndWith = String.raw`)$`

  const negatives = excludeRes.map((re, i) => {
    const reSource = normalizeReSource(re.source)
    if (!(reSource.startsWith(mustStartWith) && reSource.endsWith(mustEndWith))) {
      const pattern = ignoredRouteFiles?.[i]
      throw new Error(
        pattern
          ? `[one/metro] ignoredRouteFile pattern "${pattern}" is not supported. We cannot process the corresponding regex "${reSource}" for now.`
          : `Unsupported regex "${reSource}" in "ignoredRouteFiles".`
      )
    }
    const inner = reSource.slice(
      mustStartWith.length,
      reSource.length - mustEndWith.length
    )
    // biome-ignore lint/complexity/noUselessStringRaw: keep original code
    return String.raw`(?:.*${inner})`
  })

  return String.raw`^(?:\.\/)(?!${negatives.join('|')}$).*\.tsx?$`
}
