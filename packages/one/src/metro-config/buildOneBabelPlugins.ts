import module from 'node:module'
import path from 'node:path'
import type { PluginItem } from '@babel/core'
import mm from 'micromatch'
import tsconfigPaths from 'tsconfig-paths'
import {
  API_ROUTE_GLOB_PATTERN,
  ROUTE_NATIVE_EXCLUSION_GLOB_PATTERNS,
} from '../router/glob-patterns'
import { normalizeReSource } from './normalizeReSource'

export type BuildOneBabelPluginsOptions = {
  projectRoot: string
  relativeRouterRoot: string
  ignoredRouteFiles?: Array<`**/*${string}`>
  linking?: unknown
  setupFile?: string | { native?: string; ios?: string; android?: string }
}

export function buildRouterRequireContextRegexString(
  ignoredRouteFiles?: Array<`**/*${string}`>
): string {
  const excludeRes = [
    ...(ignoredRouteFiles || []).map((pattern) => mm.makeRe(pattern)),
    ...ROUTE_NATIVE_EXCLUSION_GLOB_PATTERNS.map((pattern) => mm.makeRe(pattern)),
    mm.makeRe(API_ROUTE_GLOB_PATTERN),
  ]

  const supportedRegexMustStartWith = String.raw`^(?:(?:^|\/|(?:(?:(?!(?:^|\/)\.).)*?)\/)(?!\.)(?=.)[^/]*?`
  // biome-ignore lint/complexity/noUselessStringRaw: keep original code
  const supportedRegexMustEndWith = String.raw`)$`

  const negativeLookaheadGroups = excludeRes.map((re, i) => {
    const reSource = normalizeReSource(re.source)

    if (
      !(
        reSource.startsWith(supportedRegexMustStartWith) &&
        reSource.endsWith(supportedRegexMustEndWith)
      )
    ) {
      const ignoredRouteFile = ignoredRouteFiles?.[i]

      if (ignoredRouteFile) {
        throw new Error(
          `[one/metro] ignoredRouteFile pattern "${ignoredRouteFile}" is not supported. We cannot process the corresponding regex "${reSource}" for now.`
        )
      }

      throw new Error(`Unsupported regex "${reSource}" in "ignoredRouteFiles".`)
    }

    const rePart = reSource.slice(
      supportedRegexMustStartWith.length,
      reSource.length - supportedRegexMustEndWith.length
    )

    // biome-ignore lint/complexity/noUselessStringRaw: keep original code
    return String.raw`(?:.*${rePart})`
  })

  return String.raw`^(?:\.\/)(?!${negativeLookaheadGroups.join('|')}$).*\.tsx?$`
}

/**
 * Build the babel plugin chain that One requires for Metro bundles.
 *
 * Shared between the Vite-driven Metro path (getViteMetroPluginOptions) and
 * the standalone `one/babel-preset` export used by user-land babel.config files.
 */
export function buildOneBabelPlugins({
  projectRoot,
  relativeRouterRoot,
  ignoredRouteFiles,
  linking,
  setupFile,
}: BuildOneBabelPluginsOptions): PluginItem[] {
  const tsconfigPathsConfigLoadResult = tsconfigPaths.loadConfig(projectRoot)

  if (tsconfigPathsConfigLoadResult.resultType === 'failed') {
    throw new Error('tsconfigPathsConfigLoadResult.resultType is not success')
  }

  const require = module.createRequire(projectRoot + '/')
  const metroEntryPath = require.resolve('one/metro-entry', {
    paths: [projectRoot],
  })

  const routerRequireContextRegexString =
    buildRouterRequireContextRegexString(ignoredRouteFiles)

  return [
    // enforce environment guard imports (server-only, client-only, etc.)
    'one/babel-plugin-environment-guard',
    // Remove server-only code (loader, generateStaticParams) from route files
    // This must run early to prevent server-only imports from being bundled
    [
      'one/babel-plugin-remove-server-code',
      {
        routerRoot: relativeRouterRoot,
      },
    ],
    [
      'babel-plugin-module-resolver',
      {
        // "vite-tsconfig-paths" for Metro
        alias: Object.fromEntries(
          Object.entries(tsconfigPathsConfigLoadResult.paths).map(([k, v]) => {
            const key = (() => {
              if (k.endsWith('/*')) {
                return k.replace(/\/\*$/, '')
              }

              // If the key does not end with "/*", only alias exact matches.
              // Ref: https://www.npmjs.com/package/babel-plugin-module-resolver/v/3.0.0#regular-expression-alias
              return `${k}$`
            })()

            let value = v[0].replace(/\/\*$/, '')

            if (!value.startsWith('./')) {
              value = `./${value}`
            }

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
        ONE_ROUTER_REQUIRE_CONTEXT_REGEX_STRING: routerRequireContextRegexString,
        ONE_ROUTER_LINKING_CONFIG: linking,
        ONE_SETUP_FILE_NATIVE: (() => {
          if (!setupFile) return undefined
          const nativeSetupFile =
            typeof setupFile === 'string'
              ? setupFile
              : setupFile.native || setupFile.ios || setupFile.android
          if (!nativeSetupFile) return undefined
          return path.relative(
            path.dirname(metroEntryPath),
            path.join(projectRoot, nativeSetupFile)
          )
        })(),
      },
    ],
    // inline ONE_SERVER_URL so native prod bundles know where to fetch loaders
    'one/babel-plugin-inline-one-server-url',
  ]
}
